// Time-sensitive compliance milestones for the active entity, rolled up into
// six dashboard cards. Read-only. Each card aggregates the live data for one
// milestone (across the portfolio's properties / active tenancies) and scores it
// with the pure date logic in lib/compliance/complianceUtils.

import { prisma } from "@/lib/db";
import {
  ComplianceRag,
  DocumentCategory,
  RentIncreaseStatus,
  RentPeriodsPerYear,
  TenancyStatus,
  type RentFrequency,
} from "@/lib/enums";
import {
  EICR_RENEWAL,
  GAS_SAFETY_RENEWAL,
  addMonths,
  certificateRenewalStatus,
  depositProtectionStatus,
  isWithinProtectedPeriod,
  protectedPeriodEnds,
  rentIncreaseClock,
  taxRoadmapStatus,
  type MilestoneStatus,
  type RenewalConfig,
} from "@/lib/compliance/complianceUtils";

export type MilestoneKey =
  | "gas"
  | "eicr"
  | "deposit"
  | "rentIncrease"
  | "evictionProtected"
  | "tax";

export interface MilestoneCard {
  key: MilestoneKey;
  title: string;
  legalRef: string;
  rag: ComplianceRag;
  /** Short badge label. */
  label: string;
  /** Main one-line status for the card body. */
  detail: string;
  /** Small secondary line (counts / context), or null. */
  meta: string | null;
  /** Extra contextual lines (used by the tax roadmap card). */
  notes: string[];
  href: string;
}

const RANK: Record<ComplianceRag, number> = {
  [ComplianceRag.RED]: 0,
  [ComplianceRag.AMBER]: 1,
  [ComplianceRag.GREEN]: 2,
};

interface LabelledStatus {
  label: string;
  status: MilestoneStatus;
}

/** The most severe item in a set (RED first). Null when the set is empty. */
function pickWorst(items: LabelledStatus[]): LabelledStatus | null {
  return items.reduce<LabelledStatus | null>((worst, it) => {
    if (!worst) return it;
    return RANK[it.status.rag] < RANK[worst.status.rag] ? it : worst;
  }, null);
}

function gbp(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------------------------------------------------------------------------

type DocRow = {
  category: string;
  issuedDate: Date | null;
  expiryDate: Date | null;
};

/**
 * The most recent "renewed date" for a certificate category on a property.
 * Prefers the issued date; falls back to deriving it from a stored expiry date
 * (expiry − one cycle) so older records that only carry an expiry still score.
 */
function latestRenewedDate(
  documents: DocRow[],
  category: string,
  cfg: RenewalConfig,
): Date | null {
  let latest: Date | null = null;
  for (const d of documents) {
    if (d.category !== category) continue;
    const renewed =
      d.issuedDate ??
      (d.expiryDate ? addMonths(d.expiryDate, -cfg.periodMonths) : null);
    if (renewed && (!latest || renewed.getTime() > latest.getTime())) {
      latest = renewed;
    }
  }
  return latest;
}

function certCard(
  key: "gas" | "eicr",
  cfg: RenewalConfig,
  legalRef: string,
  category: string,
  properties: { addressLine1: string; documents: DocRow[] }[],
  now: Date,
): MilestoneCard {
  const items: LabelledStatus[] = properties.map((p) => ({
    label: p.addressLine1,
    status: certificateRenewalStatus(
      latestRenewedDate(p.documents, category, cfg),
      cfg,
      now,
    ),
  }));
  const worst = pickWorst(items);
  const attention = items.filter(
    (i) => i.status.rag !== ComplianceRag.GREEN,
  ).length;

  return {
    key,
    title: cfg.label,
    legalRef,
    rag: worst?.status.rag ?? ComplianceRag.GREEN,
    label: worst?.status.label ?? "Compliant",
    detail:
      items.length === 0
        ? "Add a property to start tracking this certificate."
        : worst && worst.status.rag !== ComplianceRag.GREEN
          ? `${worst.label}: ${worst.status.detail}`
          : `All ${plural(items.length, "property", "properties")} hold a valid certificate.`,
    meta:
      items.length === 0
        ? null
        : attention > 0
          ? `${attention} of ${plural(items.length, "property", "properties")} need attention`
          : `${plural(items.length, "property", "properties")} · all in date`,
    notes: [],
    href: "/compliance",
  };
}

// ---------------------------------------------------------------------------

export async function getMilestoneTracker(
  accountId: string,
  now: Date = new Date(),
): Promise<MilestoneCard[]> {
  const properties = await prisma.property.findMany({
    where: { accountId, archivedAt: null },
    select: {
      id: true,
      addressLine1: true,
      documents: {
        where: {
          category: {
            in: [DocumentCategory.GAS_SAFETY, DocumentCategory.EICR],
          },
        },
        select: { category: true, issuedDate: true, expiryDate: true },
      },
      tenancies: {
        where: { status: TenancyStatus.ACTIVE, archivedAt: null },
        select: {
          startDate: true,
          rentPence: true,
          rentFrequency: true,
          depositPence: true,
          depositReceivedDate: true,
          prescribedInfoServedDate: true,
          rentIncreaseNotices: {
            where: { status: { not: RentIncreaseStatus.WITHDRAWN } },
            orderBy: { noticeServedDate: "desc" },
            take: 1,
            select: { noticeServedDate: true },
          },
        },
      },
    },
    orderBy: { addressLine1: "asc" },
  });

  // Flatten active tenancies, carrying their property label for card detail.
  const tenancies = properties.flatMap((p) =>
    p.tenancies.map((t) => ({ ...t, propertyLabel: p.addressLine1 })),
  );

  // --- 1 & 2: Gas Safety + EICR -------------------------------------------
  const gas = certCard(
    "gas",
    GAS_SAFETY_RENEWAL,
    "Gas Safety (Installation and Use) Regulations 1998",
    DocumentCategory.GAS_SAFETY,
    properties,
    now,
  );
  const eicr = certCard(
    "eicr",
    EICR_RENEWAL,
    "Electrical Safety Standards 2020",
    DocumentCategory.EICR,
    properties,
    now,
  );

  // --- 3: Deposit protection ----------------------------------------------
  const depositItems: LabelledStatus[] = tenancies
    .filter((t) => (t.depositPence ?? 0) > 0)
    .map((t) => ({
      label: t.propertyLabel,
      status: depositProtectionStatus(
        {
          receivedDate: t.depositReceivedDate,
          prescribedInfoServedDate: t.prescribedInfoServedDate,
        },
        now,
      ),
    }));
  const depositWorst = pickWorst(depositItems);
  const depositAttention = depositItems.filter(
    (i) => i.status.rag !== ComplianceRag.GREEN,
  ).length;
  const deposit: MilestoneCard = {
    key: "deposit",
    title: "Deposit protection",
    legalRef: "Housing Act 2004 · Renters' Rights Act 2025",
    rag: depositWorst?.status.rag ?? ComplianceRag.GREEN,
    label: depositWorst?.status.label ?? "Compliant",
    detail:
      depositItems.length === 0
        ? "No deposits held against active tenancies."
        : depositWorst && depositWorst.status.rag !== ComplianceRag.GREEN
          ? `${depositWorst.label}: ${depositWorst.status.detail}`
          : "All deposits protected with Prescribed Information served.",
    meta:
      depositItems.length === 0
        ? null
        : depositAttention > 0
          ? `${depositAttention} of ${plural(depositItems.length, "deposit", "deposits")} need attention`
          : `${plural(depositItems.length, "deposit", "deposits")} · all protected`,
    notes: [],
    href: "/tenancies",
  };

  // --- 4: Section 13 rent-increase clock ----------------------------------
  const rentItems = tenancies.map((t) => ({
    label: t.propertyLabel,
    clock: rentIncreaseClock(
      t.rentIncreaseNotices[0]?.noticeServedDate ?? null,
      now,
    ),
  }));
  const lockedItems = rentItems.filter((i) => i.clock.locked);
  // Most restrictive = the lock that lifts last.
  const mostRestrictive = lockedItems.reduce<(typeof lockedItems)[number] | null>(
    (latest, it) =>
      !latest ||
      (it.clock.unlockDate?.getTime() ?? 0) >
        (latest.clock.unlockDate?.getTime() ?? 0)
        ? it
        : latest,
    null,
  );
  const rentIncrease: MilestoneCard = {
    key: "rentIncrease",
    title: "Rent increase clock",
    legalRef: "Section 13, Housing Act 1988 (as amended by the RRA 2025)",
    rag:
      tenancies.length === 0
        ? ComplianceRag.GREEN
        : lockedItems.length > 0
          ? ComplianceRag.AMBER
          : ComplianceRag.GREEN,
    label: lockedItems.length > 0 ? "Locked" : "Available",
    detail:
      tenancies.length === 0
        ? "No active tenancies to increase rent on."
        : mostRestrictive
          ? `${mostRestrictive.label}: ${mostRestrictive.clock.detail}`
          : "No increases served in the last 12 months — a Section 13 notice can be issued.",
    meta:
      tenancies.length === 0
        ? null
        : `${lockedItems.length} locked · ${tenancies.length - lockedItems.length} available`,
    notes: [],
    href: "/tenancies",
  };

  // --- 5: Moving-in / Selling protected period ----------------------------
  const protectedTenancies = tenancies.filter((t) =>
    isWithinProtectedPeriod(t.startDate, now),
  );
  // Earliest date any protected tenancy clears its first 12 months.
  const soonestClear = protectedTenancies
    .map((t) => protectedPeriodEnds(t.startDate))
    .reduce<Date | null>(
      (min, d) => (!min || d.getTime() < min.getTime() ? d : min),
      null,
    );
  const evictionProtected: MilestoneCard = {
    key: "evictionProtected",
    title: "Possession protected period",
    legalRef: "Renters' Rights Act 2025 — Grounds 1 & 1A",
    rag:
      protectedTenancies.length > 0 ? ComplianceRag.AMBER : ComplianceRag.GREEN,
    label: protectedTenancies.length > 0 ? "Restricted" : "Available",
    detail:
      tenancies.length === 0
        ? "No active tenancies."
        : protectedTenancies.length > 0
          ? `${plural(protectedTenancies.length, "tenancy", "tenancies")} still within the first 12 months — possession on moving-in (Ground 1) or selling (Ground 1A) grounds is unavailable${soonestClear ? `; earliest available ${soonestClear.toISOString().slice(0, 10)}` : ""}.`
          : "All active tenancies are past their first 12 months — moving-in / selling grounds are available.",
    meta:
      tenancies.length === 0
        ? null
        : `${protectedTenancies.length} of ${plural(tenancies.length, "tenancy", "tenancies")} within protected period`,
    notes: [],
    href: "/compliance",
  };

  // --- 6: Making Tax Digital roadmap --------------------------------------
  const grossAnnualPence = tenancies.reduce((sum, t) => {
    const perYear =
      RentPeriodsPerYear[t.rentFrequency as RentFrequency] ?? 12;
    return sum + t.rentPence * perYear;
  }, 0);
  const taxStatus = taxRoadmapStatus(grossAnnualPence, now);
  const tax: MilestoneCard = {
    key: "tax",
    title: "Making Tax Digital roadmap",
    legalRef: "Making Tax Digital for Income Tax",
    rag: taxStatus.rag,
    label: taxStatus.label,
    detail: taxStatus.detail,
    meta: `Based on annualised rent of ${gbp(grossAnnualPence)}`,
    notes: taxStatus.alerts,
    href: "/mtd",
  };

  return [gas, eicr, deposit, rentIncrease, evictionProtected, tax];
}
