// Compliance RAG aggregator. Walks every property's certificates, tenancy SLAs,
// hazards, pet requests and the account's registrations, scoring each against the
// pure rules in lib/compliance, and rolls them up into a portfolio → property →
// item tree the dashboard renders. Read-only; one query per top-level entity.

import { prisma } from "@/lib/db";
import {
  COMPLIANCE_CATEGORIES,
  ComplianceRag,
  DocumentCategoryLabel,
  HazardCategoryLabel,
  HazardStatus,
  PetRequestStatus,
  RegistrationStatus,
  RightToRentStatus,
  TenancyStatus,
} from "@/lib/enums";
import {
  HAZARD_AMBER_DAYS,
  PET_AMBER_DAYS,
  RIGHT_TO_RENT_AMBER_DAYS,
  daysUntil,
  depositDeadline,
  ragForExpiry,
  worstRag,
} from "@/lib/compliance/rules";
import { ComplianceKind } from "@/lib/compliance/penalties";

export type ComplianceCategory =
  | "certificates"
  | "tenancy"
  | "registration"
  | "hazards"
  | "pets";

export interface ComplianceItem {
  id: string;
  kind: string; // ComplianceKind
  label: string;
  category: ComplianceCategory;
  propertyId: string | null;
  propertyLabel: string | null;
  rag: ComplianceRag;
  detail: string;
  dueDate: Date | null;
  href: string;
}

export interface PropertyComplianceSummary {
  propertyId: string;
  propertyLabel: string;
  rag: ComplianceRag;
  categories: Partial<Record<ComplianceCategory, ComplianceRag>>;
  items: ComplianceItem[];
}

export interface ComplianceOverview {
  rag: ComplianceRag;
  counts: { red: number; amber: number; green: number };
  isFullyCompliant: boolean;
  properties: PropertyComplianceSummary[];
  portfolioItems: ComplianceItem[];
  attention: ComplianceItem[];
}

const REQUIRED_CERTS = ["GAS_SAFETY", "EICR", "EPC"] as const;
const DOC_KIND: Record<string, string> = {
  GAS_SAFETY: ComplianceKind.GAS_SAFETY,
  EICR: ComplianceKind.EICR,
  EPC: ComplianceKind.EPC,
};

/** Relative human detail for a deadline ("Overdue by 3 days" / "Due … in 12 days"). */
function relDetail(verb: string, date: Date, now: Date): string {
  const d = daysUntil(date, now);
  const iso = date.toISOString().slice(0, 10);
  if (d < 0) {
    const n = Math.abs(d);
    return `Overdue by ${n} day${n === 1 ? "" : "s"} (${verb} ${iso})`;
  }
  if (d === 0) return `${cap(verb)} today (${iso})`;
  return `${cap(verb)} ${iso} (in ${d} day${d === 1 ? "" : "s"})`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const RANK: Record<ComplianceRag, number> = {
  [ComplianceRag.RED]: 0,
  [ComplianceRag.AMBER]: 1,
  [ComplianceRag.GREEN]: 2,
};

export async function getComplianceOverview(
  accountId: string,
  now: Date = new Date(),
): Promise<ComplianceOverview> {
  const [properties, registration] = await Promise.all([
    prisma.property.findMany({
      where: { accountId, archivedAt: null },
      select: {
        id: true,
        addressLine1: true,
        epcRating: true,
        epcExpiryDate: true,
        prsdStatus: true,
        documents: {
          where: { category: { in: COMPLIANCE_CATEGORIES }, expiryDate: { not: null } },
          select: { id: true, category: true, expiryDate: true },
        },
        tenancies: {
          where: { status: TenancyStatus.ACTIVE, archivedAt: null },
          select: {
            id: true,
            depositPence: true,
            depositReceivedDate: true,
            depositProtectedDate: true,
            prescribedInfoServedDate: true,
            tenants: {
              select: {
                id: true,
                name: true,
                rightToRentStatus: true,
                rightToRentExpiry: true,
              },
            },
            petRequests: {
              where: {
                status: {
                  in: [PetRequestStatus.PENDING, PetRequestStatus.INFO_REQUESTED],
                },
              },
              select: { id: true, responseDeadline: true, petDescription: true },
            },
          },
        },
        hazardReports: {
          where: { status: { not: HazardStatus.RESOLVED } },
          select: {
            id: true,
            category: true,
            status: true,
            investigatedAt: true,
            investigateByDate: true,
            repairStartByDate: true,
          },
        },
      },
      orderBy: { addressLine1: "asc" },
    }),
    prisma.landlordRegistration.findUnique({ where: { accountId } }),
  ]);

  const propertySummaries: PropertyComplianceSummary[] = properties.map((p) => {
    const items: ComplianceItem[] = [];
    const certHref = `/properties/${p.id}/compliance`;
    const presentCerts = new Map(p.documents.map((d) => [d.category, d]));

    // Certificates — required trio (gap = RED) + any other expiring certs.
    for (const cert of REQUIRED_CERTS) {
      const doc = presentCerts.get(cert);
      if (cert === "EPC") {
        const epcExpiry = doc?.expiryDate ?? p.epcExpiryDate ?? null;
        const belowBand =
          p.epcRating != null && p.epcRating > "C"; // "D".."G" are below C
        const rag = epcExpiry
          ? belowBand
            ? worstRag([ComplianceRag.AMBER, ragForExpiry(epcExpiry, now)])
            : ragForExpiry(epcExpiry, now)
          : ComplianceRag.RED;
        items.push({
          id: doc?.id ?? `epc:${p.id}`,
          kind: ComplianceKind.EPC,
          label: "EPC (min. band C)",
          category: "certificates",
          propertyId: p.id,
          propertyLabel: p.addressLine1,
          rag,
          detail: !epcExpiry
            ? "No EPC on record"
            : belowBand
              ? `Rated ${p.epcRating} — below the minimum band C; ${relDetail("expires", epcExpiry, now)}`
              : relDetail("expires", epcExpiry, now),
          dueDate: epcExpiry,
          href: certHref,
        });
        continue;
      }
      if (!doc) {
        items.push({
          id: `${cert}:${p.id}`,
          kind: DOC_KIND[cert],
          label: DocumentCategoryLabel[cert as keyof typeof DocumentCategoryLabel],
          category: "certificates",
          propertyId: p.id,
          propertyLabel: p.addressLine1,
          rag: ComplianceRag.RED,
          detail: "Not on record",
          dueDate: null,
          href: certHref,
        });
      } else {
        items.push({
          id: doc.id,
          kind: DOC_KIND[cert],
          label: DocumentCategoryLabel[cert as keyof typeof DocumentCategoryLabel],
          category: "certificates",
          propertyId: p.id,
          propertyLabel: p.addressLine1,
          rag: ragForExpiry(doc.expiryDate, now),
          detail: relDetail("expires", doc.expiryDate!, now),
          dueDate: doc.expiryDate,
          href: certHref,
        });
      }
    }
    // Other (non-required) certificates already on record — surface if amber/red.
    for (const d of p.documents) {
      if (REQUIRED_CERTS.includes(d.category as (typeof REQUIRED_CERTS)[number])) continue;
      const rag = ragForExpiry(d.expiryDate, now);
      if (rag === ComplianceRag.GREEN) continue;
      items.push({
        id: d.id,
        kind: ComplianceKind.CERTIFICATE,
        label:
          DocumentCategoryLabel[d.category as keyof typeof DocumentCategoryLabel] ??
          d.category,
        category: "certificates",
        propertyId: p.id,
        propertyLabel: p.addressLine1,
        rag,
        detail: relDetail("expires", d.expiryDate!, now),
        dueDate: d.expiryDate,
        href: certHref,
      });
    }

    // PRSD registration (per property, required under the RRA).
    if (p.prsdStatus !== "ACTIVE") {
      items.push({
        id: `prsd:${p.id}`,
        kind: ComplianceKind.PRSD,
        label: "Private Rented Sector Database",
        category: "registration",
        propertyId: p.id,
        propertyLabel: p.addressLine1,
        rag: ComplianceRag.RED,
        detail: "Property not registered on the PRSD",
        dueDate: null,
        href: certHref,
      });
    }

    // Tenancy SLAs — deposit protection + Right to Rent.
    for (const t of p.tenancies) {
      if ((t.depositPence ?? 0) > 0) {
        const protectedOk = !!t.depositProtectedDate && !!t.prescribedInfoServedDate;
        if (!protectedOk) {
          const deadline = t.depositReceivedDate
            ? depositDeadline(t.depositReceivedDate)
            : null;
          items.push({
            id: `deposit:${t.id}`,
            kind: ComplianceKind.DEPOSIT,
            label: "Deposit protection + Prescribed Info",
            category: "tenancy",
            propertyId: p.id,
            propertyLabel: p.addressLine1,
            rag: deadline ? ragForExpiry(deadline, now) : ComplianceRag.AMBER,
            detail: deadline
              ? relDetail("protect + serve by", deadline, now)
              : "Deposit taken — protection status not recorded",
            dueDate: deadline,
            href: `/tenancies`,
          });
        }
      }
      for (const tn of t.tenants) {
        if (tn.rightToRentStatus === RightToRentStatus.TIME_LIMITED) {
          items.push({
            id: `rtr:${tn.id}`,
            kind: ComplianceKind.RIGHT_TO_RENT,
            label: `Right to Rent — ${tn.name}`,
            category: "tenancy",
            propertyId: p.id,
            propertyLabel: p.addressLine1,
            rag: tn.rightToRentExpiry
              ? ragForExpiry(tn.rightToRentExpiry, now, RIGHT_TO_RENT_AMBER_DAYS)
              : ComplianceRag.AMBER,
            detail: tn.rightToRentExpiry
              ? relDetail("re-check by", tn.rightToRentExpiry, now)
              : "Time-limited status — no follow-up date recorded",
            dueDate: tn.rightToRentExpiry,
            href: `/tenancies`,
          });
        }
      }
      // Pet requests awaiting a decision.
      for (const pet of t.petRequests) {
        items.push({
          id: `pet:${pet.id}`,
          kind: ComplianceKind.PET,
          label: `Pet request — ${pet.petDescription}`,
          category: "pets",
          propertyId: p.id,
          propertyLabel: p.addressLine1,
          rag: ragForExpiry(pet.responseDeadline, now, PET_AMBER_DAYS),
          detail: relDetail("respond by", pet.responseDeadline, now),
          dueDate: pet.responseDeadline,
          href: `/compliance/pets`,
        });
      }
    }

    // Open hazards (Awaab's Law SLA).
    for (const h of p.hazardReports) {
      const deadline = h.investigatedAt ? h.repairStartByDate : h.investigateByDate;
      const breached = h.status === HazardStatus.BREACHED;
      items.push({
        id: `hazard:${h.id}`,
        kind: ComplianceKind.HAZARD,
        label: `Hazard — ${
          HazardCategoryLabel[h.category as keyof typeof HazardCategoryLabel] ??
          h.category
        }`,
        category: "hazards",
        propertyId: p.id,
        propertyLabel: p.addressLine1,
        rag: breached
          ? ComplianceRag.RED
          : deadline
            ? ragForExpiry(deadline, now, HAZARD_AMBER_DAYS)
            : ComplianceRag.AMBER,
        detail: breached
          ? "SLA breached — overdue"
          : deadline
            ? relDetail(h.investigatedAt ? "begin repair by" : "investigate by", deadline, now)
            : "Awaiting scheduling",
        dueDate: deadline,
        href: `/compliance/hazards`,
      });
    }

    const categories: Partial<Record<ComplianceCategory, ComplianceRag>> = {};
    for (const it of items) {
      const prev = categories[it.category];
      categories[it.category] = prev ? worstRag([prev, it.rag]) : it.rag;
    }

    return {
      propertyId: p.id,
      propertyLabel: p.addressLine1,
      rag: worstRag(items.map((i) => i.rag)),
      categories,
      items,
    };
  });

  // Account-level: PRS Landlord Ombudsman registration.
  const portfolioItems: ComplianceItem[] = [];
  if (!registration || registration.status !== RegistrationStatus.ACTIVE) {
    portfolioItems.push({
      id: "ombudsman",
      kind: ComplianceKind.OMBUDSMAN,
      label: "PRS Landlord Ombudsman membership",
      category: "registration",
      propertyId: null,
      propertyLabel: null,
      rag: ComplianceRag.RED,
      detail: registration?.status
        ? `Registration ${registration.status.toLowerCase()}`
        : "Not registered with the PRS Landlord Ombudsman",
      dueDate: null,
      href: "/compliance/registrations",
    });
  } else if (registration.ombudsmanRenewalDate) {
    portfolioItems.push({
      id: "ombudsman",
      kind: ComplianceKind.OMBUDSMAN,
      label: "PRS Landlord Ombudsman membership",
      category: "registration",
      propertyId: null,
      propertyLabel: null,
      rag: ragForExpiry(registration.ombudsmanRenewalDate, now),
      detail: relDetail("renew by", registration.ombudsmanRenewalDate, now),
      dueDate: registration.ombudsmanRenewalDate,
      href: "/compliance/registrations",
    });
  }

  const allItems = [...portfolioItems, ...propertySummaries.flatMap((s) => s.items)];
  const counts = {
    red: allItems.filter((i) => i.rag === ComplianceRag.RED).length,
    amber: allItems.filter((i) => i.rag === ComplianceRag.AMBER).length,
    green: allItems.filter((i) => i.rag === ComplianceRag.GREEN).length,
  };
  const rag = worstRag(allItems.map((i) => i.rag));
  const attention = allItems
    .filter((i) => i.rag !== ComplianceRag.GREEN)
    .sort(
      (a, b) =>
        RANK[a.rag] - RANK[b.rag] ||
        (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity),
    );

  return {
    rag,
    counts,
    isFullyCompliant: counts.red === 0 && counts.amber === 0,
    properties: propertySummaries,
    portfolioItems,
    attention,
  };
}
