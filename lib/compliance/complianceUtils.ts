// Stateful, date-aware compliance milestones — the headline UK letting
// regulations a landlord has to track on a clock (gas/EICR renewals, the deposit
// protection window, the Section 13 rent-increase lock, the RRA possession
// "protected period" and the Making Tax Digital roadmap).
//
// Pure: no DB, no React. The same functions power the dashboard cards
// (services/compliance/milestones.ts), the write-path guards
// (services/compliance/guards.ts) and the unit tests, so each threshold lives in
// exactly one place. Intervals/windows that already exist in ./rules are imported
// rather than re-declared.

import { ComplianceRag } from "@/lib/enums";
import {
  DEPOSIT_PROTECTION_DAYS,
  RAG_AMBER_DAYS,
  daysUntil,
  depositDeadline,
} from "@/lib/compliance/rules";

// ---------------------------------------------------------------------------
// Calendar arithmetic
//
// rules.ts counts in whole days; renewal cycles here run in calendar months and
// years (a 12-month gas certificate, a 5-year EICR), which must respect month
// lengths and leap years rather than a flat 365 × n. All maths is in UTC to match
// how the app prints dates (toISOString) and how Prisma stores DateTime.
// ---------------------------------------------------------------------------

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1); // avoid e.g. 31 Jan + 1 month rolling into March
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDayOfMonth = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDayOfMonth)); // clamp (29 Feb → 28 Feb)
  return d;
}

export function addYears(date: Date, years: number): Date {
  return addMonths(date, years * 12);
}

/** ISO yyyy-mm-dd, matching how the rest of the app prints dates. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "April 2026" — for the tax roadmap copy. */
export function monthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "in 12 days" / "3 days ago" / "today". */
function whenPhrase(date: Date, now: Date): string {
  const d = daysUntil(date, now);
  if (d === 0) return "today";
  const n = Math.abs(d);
  const unit = n === 1 ? "day" : "days";
  return d > 0 ? `in ${n} ${unit}` : `${n} ${unit} ago`;
}

// ---------------------------------------------------------------------------
// Shared milestone status
// ---------------------------------------------------------------------------

export type MilestoneState =
  | "compliant" // green — nothing to do
  | "due_soon" // amber — inside the warning window
  | "action_required" // red — overdue or a required entry is missing
  | "locked" // amber — an action is intentionally barred for now
  | "blocked"; // red — an attempted action is not permitted yet

export interface MilestoneStatus {
  state: MilestoneState;
  /** Traffic-light colour for the badge, derived from `state`. */
  rag: ComplianceRag;
  /** Short badge label ("Action required", "Due soon", "Locked"). */
  label: string;
  /** One-sentence, human-readable explanation for the card body. */
  detail: string;
  /** The governing date (expiry / deadline / unlock), or null when none. */
  dueDate: Date | null;
  /** Whole days until `dueDate` (negative once past); null when no date. */
  daysRemaining: number | null;
}

const STATE_RAG: Record<MilestoneState, ComplianceRag> = {
  compliant: ComplianceRag.GREEN,
  due_soon: ComplianceRag.AMBER,
  action_required: ComplianceRag.RED,
  locked: ComplianceRag.AMBER,
  blocked: ComplianceRag.RED,
};

const STATE_LABEL: Record<MilestoneState, string> = {
  compliant: "Compliant",
  due_soon: "Due soon",
  action_required: "Action required",
  locked: "Locked",
  blocked: "Not permitted yet",
};

function buildStatus(
  state: MilestoneState,
  detail: string,
  dueDate: Date | null,
  now: Date,
  label?: string,
): MilestoneStatus {
  return {
    state,
    rag: STATE_RAG[state],
    label: label ?? STATE_LABEL[state],
    detail,
    dueDate,
    daysRemaining: dueDate ? daysUntil(dueDate, now) : null,
  };
}

// ---------------------------------------------------------------------------
// 1 & 2 — Expiring certificates: Gas Safety (12 months) and EICR (5 years)
//
// The "renewed date entry" is the date the certificate was last issued/renewed;
// expiry is that date plus the cycle. A landlord is warned `warnDays` before
// expiry (gas: 30 days). A missing entry is treated as RED — a required
// certificate that is "not on record" is never silently compliant.
// ---------------------------------------------------------------------------

export interface RenewalConfig {
  /** Cycle length in months (gas: 12, EICR: 60). */
  periodMonths: number;
  /** Days before expiry to start warning. */
  warnDays: number;
  /** Display name, e.g. "Gas Safety Certificate". */
  label: string;
  /** Human cadence, e.g. "every 12 months". */
  cadence: string;
}

export const GAS_SAFETY_RENEWAL: RenewalConfig = {
  periodMonths: 12,
  warnDays: 30,
  label: "Gas Safety Certificate",
  cadence: "every 12 months",
};

export const EICR_RENEWAL: RenewalConfig = {
  periodMonths: 60,
  warnDays: RAG_AMBER_DAYS, // 30 days, consistent with other certificate expiries
  label: "EICR (electrical safety)",
  cadence: "every 5 years",
};

/** Expiry of a certificate last renewed on `renewedDate` under `cfg`. */
export function certificateExpiry(renewedDate: Date, cfg: RenewalConfig): Date {
  return addMonths(renewedDate, cfg.periodMonths);
}

/** Stateful status for an expiring certificate given its last renewal date. */
export function certificateRenewalStatus(
  renewedDate: Date | null | undefined,
  cfg: RenewalConfig,
  now: Date = new Date(),
): MilestoneStatus {
  if (!renewedDate) {
    return buildStatus(
      "action_required",
      `No ${cfg.label} on record — one is required ${cfg.cadence}. Add the renewal date.`,
      null,
      now,
      "Missing",
    );
  }
  const expiry = certificateExpiry(renewedDate, cfg);
  const d = daysUntil(expiry, now);
  if (d < 0) {
    return buildStatus(
      "action_required",
      `${cfg.label} expired ${whenPhrase(expiry, now)} (${isoDate(expiry)}). Renew it now.`,
      expiry,
      now,
      "Expired",
    );
  }
  if (d <= cfg.warnDays) {
    return buildStatus(
      "due_soon",
      `${cfg.label} expires ${whenPhrase(expiry, now)} (${isoDate(expiry)}). Book the renewal.`,
      expiry,
      now,
    );
  }
  return buildStatus(
    "compliant",
    `${cfg.label} valid until ${isoDate(expiry)} (expires ${whenPhrase(expiry, now)}).`,
    expiry,
    now,
  );
}

export function gasSafetyStatus(
  renewedDate: Date | null | undefined,
  now: Date = new Date(),
): MilestoneStatus {
  return certificateRenewalStatus(renewedDate, GAS_SAFETY_RENEWAL, now);
}

export function eicrStatus(
  renewedDate: Date | null | undefined,
  now: Date = new Date(),
): MilestoneStatus {
  return certificateRenewalStatus(renewedDate, EICR_RENEWAL, now);
}

// ---------------------------------------------------------------------------
// 3 — Deposit protection tracker
//
// From the "Deposit Received Date" a 30-day clock runs to protect the deposit
// AND serve the Prescribed Information. The explicit rule: flag "Action required"
// when the "Protected & Prescribed Info Served Date" is blank and > 30 days have
// elapsed. Inside the window it is "Due soon"; once served it is compliant.
// ---------------------------------------------------------------------------

export interface DepositInput {
  /** "Deposit Received Date". */
  receivedDate: Date | null | undefined;
  /** "Protected & Prescribed Info Served Date" (blank until served). */
  prescribedInfoServedDate: Date | null | undefined;
}

/** The explicit rule: PI date blank AND > 30 days since the deposit was received. */
export function depositActionRequired(
  input: DepositInput,
  now: Date = new Date(),
): boolean {
  if (!input.receivedDate || input.prescribedInfoServedDate) return false;
  return daysUntil(depositDeadline(input.receivedDate), now) < 0;
}

export function depositProtectionStatus(
  input: DepositInput,
  now: Date = new Date(),
): MilestoneStatus {
  const { receivedDate, prescribedInfoServedDate } = input;
  if (!receivedDate) {
    return buildStatus(
      "action_required",
      "No deposit received date recorded — add it to start the 30-day protection clock.",
      null,
      now,
      "Missing date",
    );
  }
  if (prescribedInfoServedDate) {
    return buildStatus(
      "compliant",
      `Deposit protected and Prescribed Information served on ${isoDate(prescribedInfoServedDate)}.`,
      null,
      now,
    );
  }
  const deadline = depositDeadline(receivedDate); // received + 30 days
  if (daysUntil(deadline, now) < 0) {
    return buildStatus(
      "action_required",
      `Prescribed Information still not served — the ${DEPOSIT_PROTECTION_DAYS}-day deadline passed ${whenPhrase(deadline, now)} (deposit received ${isoDate(receivedDate)}). Protect the deposit and serve the prescribed information now.`,
      deadline,
      now,
    );
  }
  return buildStatus(
    "due_soon",
    `Protect the deposit and serve the Prescribed Information by ${isoDate(deadline)} (${whenPhrase(deadline, now)}).`,
    deadline,
    now,
  );
}

// ---------------------------------------------------------------------------
// 4 — Section 13 rent-increase clock
//
// A logged increase locks out the next one for 12 months. This is the
// user-facing display clock, keyed off the date a notice was last served; the
// authoritative write-path enforcement lives in
// services/compliance/guards.ts (assertRentIncreaseAllowed).
// ---------------------------------------------------------------------------

export const RENT_INCREASE_LOCK_MONTHS = 12;

/** The date a fresh Section 13 notice becomes permissible again. */
export function rentIncreaseUnlockDate(lastNoticeDate: Date): Date {
  return addMonths(lastNoticeDate, RENT_INCREASE_LOCK_MONTHS);
}

/** Whether a new Section 13 notice can be served now. */
export function canServeRentIncrease(
  lastNoticeDate: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!lastNoticeDate) return true;
  return now.getTime() >= rentIncreaseUnlockDate(lastNoticeDate).getTime();
}

export interface RentIncreaseClock extends MilestoneStatus {
  locked: boolean;
  /** When the lock lifts (null when nothing has been served). */
  unlockDate: Date | null;
}

export function rentIncreaseClock(
  lastNoticeDate: Date | null | undefined,
  now: Date = new Date(),
): RentIncreaseClock {
  if (!lastNoticeDate) {
    const base = buildStatus(
      "compliant",
      "No rent increase served in the last 12 months — a Section 13 notice can be issued.",
      null,
      now,
      "Available",
    );
    return { ...base, locked: false, unlockDate: null };
  }
  const unlock = rentIncreaseUnlockDate(lastNoticeDate);
  if (now.getTime() >= unlock.getTime()) {
    const base = buildStatus(
      "compliant",
      `Last increase served ${isoDate(lastNoticeDate)}; the 12-month lock has lifted — a new Section 13 notice can be issued.`,
      null,
      now,
      "Available",
    );
    return { ...base, locked: false, unlockDate: unlock };
  }
  const base = buildStatus(
    "locked",
    `Rent was last increased on ${isoDate(lastNoticeDate)}. Another increase is locked until ${isoDate(unlock)} (${whenPhrase(unlock, now)}).`,
    unlock,
    now,
  );
  return { ...base, locked: true, unlockDate: unlock };
}

// ---------------------------------------------------------------------------
// 5 — Moving-in / Selling possession "protected period"
//
// RRA 2025: possession on Ground 1 (landlord/family moving in) and Ground 1A
// (landlord selling) cannot be sought in the first 12 months of a tenancy. This
// powers a UI warning and the assertEvictionGroundAllowed write guard.
// ---------------------------------------------------------------------------

export const TENANCY_PROTECTED_PERIOD_MONTHS = 12;

export const ProtectedEvictionGround = {
  MOVING_IN: "MOVING_IN", // Ground 1 — landlord or close family moving in
  SELLING: "SELLING", // Ground 1A — landlord selling the property
} as const;
export type ProtectedEvictionGround =
  (typeof ProtectedEvictionGround)[keyof typeof ProtectedEvictionGround];

const GROUND_LABEL: Record<ProtectedEvictionGround, string> = {
  MOVING_IN: "moving in (Ground 1)",
  SELLING: "selling the property (Ground 1A)",
};

/** The date the 12-month protected period ends for a tenancy. */
export function protectedPeriodEnds(tenancyStartDate: Date): Date {
  return addMonths(tenancyStartDate, TENANCY_PROTECTED_PERIOD_MONTHS);
}

/** Whether `on` falls within the first 12 months of the tenancy. */
export function isWithinProtectedPeriod(
  tenancyStartDate: Date,
  on: Date = new Date(),
): boolean {
  return on.getTime() < protectedPeriodEnds(tenancyStartDate).getTime();
}

export interface EvictionCheckInput {
  tenancyStartDate: Date;
  ground: ProtectedEvictionGround;
  /** Date the landlord wants to serve the notice; defaults to `now`. */
  noticeDate?: Date | null;
}

export interface EvictionGroundStatus extends MilestoneStatus {
  allowed: boolean;
}

export function evictionGroundStatus(
  input: EvictionCheckInput,
  now: Date = new Date(),
): EvictionGroundStatus {
  const on = input.noticeDate ?? now;
  const ends = protectedPeriodEnds(input.tenancyStartDate);
  if (on.getTime() >= ends.getTime()) {
    const base = buildStatus(
      "compliant",
      `The first 12 months ended ${isoDate(ends)} — possession on the ground of ${GROUND_LABEL[input.ground]} is available.`,
      ends,
      now,
      "Available",
    );
    return { ...base, allowed: true };
  }
  const base = buildStatus(
    "blocked",
    `Possession on the ground of ${GROUND_LABEL[input.ground]} cannot be sought until ${isoDate(ends)} (${whenPhrase(ends, now)}) — the Renters' Rights Act 2025 protects the first 12 months of a tenancy.`,
    ends,
    now,
  );
  return { ...base, allowed: false };
}

// ---------------------------------------------------------------------------
// 6 — Making Tax Digital roadmap alerts
//
// MTD for Income Tax is mandated in phases by qualifying income: over £50,000
// from April 2026, over £30,000 from April 2027, over £20,000 from April 2028.
// The alert shown depends on the landlord's gross income and today's date.
// ---------------------------------------------------------------------------

export interface MtdMilestone {
  thresholdPence: number;
  thresholdLabel: string;
  effectiveDate: Date;
}

export const MTD_ROADMAP: readonly MtdMilestone[] = [
  {
    thresholdPence: 50_000_00,
    thresholdLabel: "£50,000",
    effectiveDate: new Date(Date.UTC(2026, 3, 6)), // 6 April 2026
  },
  {
    thresholdPence: 30_000_00,
    thresholdLabel: "£30,000",
    effectiveDate: new Date(Date.UTC(2027, 3, 6)), // 6 April 2027
  },
  {
    thresholdPence: 20_000_00,
    thresholdLabel: "£20,000",
    effectiveDate: new Date(Date.UTC(2028, 3, 6)), // 6 April 2028
  },
] as const;

/**
 * The first roadmap milestone whose threshold the income exceeds — i.e. the
 * earliest date MTD becomes mandatory for this landlord. Null when income is at
 * or below the lowest (£20,000) threshold. Uses strict "over" (HMRC: "more than").
 */
export function mtdMandationMilestone(
  grossIncomePence: number,
): MtdMilestone | null {
  // Roadmap is ordered by descending threshold / ascending date, so the first
  // milestone the income exceeds is also the earliest one that applies.
  for (const m of MTD_ROADMAP) {
    if (grossIncomePence > m.thresholdPence) return m;
  }
  return null;
}

export interface TaxRoadmapStatus extends MilestoneStatus {
  /** The threshold that brings this landlord into scope (null if none yet). */
  thresholdPence: number | null;
  /** When MTD becomes mandatory for them (null if not in the roadmap). */
  effectiveDate: Date | null;
  /** Contextual one-liners for the card. */
  alerts: string[];
  roadmap: readonly MtdMilestone[];
}

function gbp(pence: number): string {
  return `£${Math.round(pence / 100).toLocaleString("en-GB")}`;
}

export function taxRoadmapStatus(
  grossIncomePence: number,
  now: Date = new Date(),
): TaxRoadmapStatus {
  const milestone = mtdMandationMilestone(grossIncomePence);

  if (!milestone) {
    const base = buildStatus(
      "compliant",
      `Gross property income (${gbp(grossIncomePence)}) is below the £20,000 Making Tax Digital threshold — MTD for Income Tax is not yet required.`,
      null,
      now,
      "Not required",
    );
    return {
      ...base,
      thresholdPence: null,
      effectiveDate: null,
      alerts: [
        "MTD for Income Tax phases in by income: over £50,000 from April 2026, £30,000 from April 2027, then £20,000 from April 2028.",
      ],
      roadmap: MTD_ROADMAP,
    };
  }

  const d = daysUntil(milestone.effectiveDate, now);
  let base: MilestoneStatus;
  if (d <= 0) {
    base = buildStatus(
      "action_required",
      `Making Tax Digital for Income Tax is mandatory for you — gross property income (${gbp(grossIncomePence)}) is over ${milestone.thresholdLabel}, in force since ${isoDate(milestone.effectiveDate)}. Keep digital records and file quarterly updates.`,
      milestone.effectiveDate,
      now,
      "Required now",
    );
  } else if (d <= 365) {
    base = buildStatus(
      "due_soon",
      `Making Tax Digital becomes mandatory for you on ${isoDate(milestone.effectiveDate)} (${whenPhrase(milestone.effectiveDate, now)}) — gross property income (${gbp(grossIncomePence)}) is over ${milestone.thresholdLabel}. Start keeping digital records now.`,
      milestone.effectiveDate,
      now,
      "Coming up",
    );
  } else {
    base = buildStatus(
      "compliant",
      `Making Tax Digital will apply to you from ${isoDate(milestone.effectiveDate)} as gross property income (${gbp(grossIncomePence)}) is over ${milestone.thresholdLabel}.`,
      milestone.effectiveDate,
      now,
      "On the horizon",
    );
  }

  const idx = MTD_ROADMAP.indexOf(milestone);
  const alerts = [
    `Making Tax Digital required for gross income over ${milestone.thresholdLabel} as of ${monthYear(milestone.effectiveDate)}.`,
  ];
  const nextDrop = MTD_ROADMAP[idx + 1];
  if (nextDrop) {
    alerts.push(
      `Next threshold drops to ${nextDrop.thresholdLabel} in ${monthYear(nextDrop.effectiveDate)}.`,
    );
  }

  return {
    ...base,
    thresholdPence: milestone.thresholdPence,
    effectiveDate: milestone.effectiveDate,
    alerts,
    roadmap: MTD_ROADMAP,
  };
}
