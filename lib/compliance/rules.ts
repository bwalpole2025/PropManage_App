// Pure domain rules for UK letting compliance + the Renters' Rights Act 2025.
// No DB access — imported by services, jobs, email templates and the UI so the
// thresholds live in exactly one place.

import { ComplianceRag, HazardSeverity } from "@/lib/enums";

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `now` until `date` (negative once past). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.floor((date.getTime() - now.getTime()) / DAY_MS);
}

// ---------------------------------------------------------------------------
// RAG (Red / Amber / Green)
// ---------------------------------------------------------------------------

/** ≤ this many days to expiry turns an item AMBER; past expiry is RED. */
export const RAG_AMBER_DAYS = 30;

/**
 * RAG for a date-driven item (certificate, registration renewal, RtR expiry,
 * deposit/SLA deadline). A missing date for a *required* item is treated as RED
 * by the caller; here `null` also resolves to RED so "no expiry on record" never
 * reads as compliant.
 */
export function ragForExpiry(
  expiry: Date | null | undefined,
  now: Date = new Date(),
  amberDays = RAG_AMBER_DAYS,
): ComplianceRag {
  if (!expiry) return ComplianceRag.RED;
  const d = daysUntil(expiry, now);
  if (d < 0) return ComplianceRag.RED;
  if (d <= amberDays) return ComplianceRag.AMBER;
  return ComplianceRag.GREEN;
}

/** The most severe RAG in a set (RED > AMBER > GREEN). Empty → GREEN. */
export function worstRag(rags: ComplianceRag[]): ComplianceRag {
  if (rags.includes(ComplianceRag.RED)) return ComplianceRag.RED;
  if (rags.includes(ComplianceRag.AMBER)) return ComplianceRag.AMBER;
  return ComplianceRag.GREEN;
}

// ---------------------------------------------------------------------------
// Reminder escalation — warning windows + tiers
// ---------------------------------------------------------------------------

/** Pre-expiry warning windows (days before). Mirrors DEFAULT_REMINDER_OFFSETS. */
export const REMINDER_OFFSETS_DAYS = [30, 14, 7] as const;

export type ReminderTier = "FIRST" | "SECOND" | "FINAL" | "URGENT";

/** Map an offset (days before expiry; ≤0 = on/after expiry) to a warning tier. */
export function tierForOffset(offsetDays: number): ReminderTier {
  if (offsetDays <= 0) return "URGENT";
  if (offsetDays <= 7) return "FINAL";
  if (offsetDays <= 14) return "SECOND";
  return "FIRST";
}

export const ReminderTierLabel: Record<ReminderTier, string> = {
  FIRST: "First warning",
  SECOND: "Second warning",
  FINAL: "Final warning — action required",
  URGENT: "URGENT: compliance breach",
};

// ---------------------------------------------------------------------------
// Awaab's Law / Decent Homes — hazard SLA windows by severity
// ---------------------------------------------------------------------------

export interface HazardSla {
  /** Days from report to investigate / inspect. */
  investigateByDays: number;
  /** Days from report to begin (or, for emergencies, complete) repairs. */
  repairStartByDays: number;
}

// Indicative statutory windows. EMERGENCY = imminent risk to health/safety:
// make safe within 24h. SIGNIFICANT = investigate promptly then begin repairs.
export const HAZARD_SLA: Record<HazardSeverity, HazardSla> = {
  EMERGENCY: { investigateByDays: 1, repairStartByDays: 1 },
  SIGNIFICANT: { investigateByDays: 10, repairStartByDays: 15 },
  STANDARD: { investigateByDays: 14, repairStartByDays: 28 },
};

export function computeHazardDeadlines(
  severity: HazardSeverity,
  reportedDate: Date,
): { investigateByDate: Date; repairStartByDate: Date } {
  const sla = HAZARD_SLA[severity] ?? HAZARD_SLA.STANDARD;
  return {
    investigateByDate: new Date(
      reportedDate.getTime() + sla.investigateByDays * DAY_MS,
    ),
    repairStartByDate: new Date(
      reportedDate.getTime() + sla.repairStartByDays * DAY_MS,
    ),
  };
}

/** Hazards escalate fast — a tighter amber window than document expiries. */
export const HAZARD_AMBER_DAYS = 3;

// ---------------------------------------------------------------------------
// Pet requests (RRA 2025) — must respond within the statutory window
// ---------------------------------------------------------------------------

export const PET_RESPONSE_DAYS = 28;
export const PET_RESPONSE_EXTENDED_DAYS = 42; // when more info is reasonably sought
export const PET_AMBER_DAYS = 7;

export function computePetDeadline(
  requestedDate: Date,
  infoRequested = false,
): Date {
  const days = infoRequested ? PET_RESPONSE_EXTENDED_DAYS : PET_RESPONSE_DAYS;
  return new Date(requestedDate.getTime() + days * DAY_MS);
}

// ---------------------------------------------------------------------------
// Deposit protection — protect + serve Prescribed Information within 30 days
// ---------------------------------------------------------------------------

export const DEPOSIT_PROTECTION_DAYS = 30;

export function depositDeadline(receivedDate: Date): Date {
  return new Date(receivedDate.getTime() + DEPOSIT_PROTECTION_DAYS * DAY_MS);
}

// ---------------------------------------------------------------------------
// Section 13 rent increase (RRA 2025)
// ---------------------------------------------------------------------------

/** At most one increase per rolling 12 months. */
export const RENT_INCREASE_MIN_INTERVAL_DAYS = 365;
/** A Section 13 notice must give at least two months' notice. */
export const RENT_INCREASE_MIN_NOTICE_DAYS = 60;

// ---------------------------------------------------------------------------
// Right to Rent — follow-up before a time-limited visa expires
// ---------------------------------------------------------------------------

export const RIGHT_TO_RENT_AMBER_DAYS = 30;

// ---------------------------------------------------------------------------
// Rent in advance (RRA 2025) — no more than one rent period upfront
// ---------------------------------------------------------------------------

/** Max permitted upfront rent equals exactly one rent period (per-period rent). */
export function maxRentInAdvancePence(perPeriodRentPence: number): number {
  return perPeriodRentPence;
}
