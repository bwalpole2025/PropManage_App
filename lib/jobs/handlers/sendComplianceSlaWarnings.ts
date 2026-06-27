import { prisma } from "@/lib/db";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { isAfterSendHour, localDaysUntil } from "@/lib/notifications/schedule";
import { offsetBucket } from "@/lib/notifications/due";
import { NotificationKind } from "@/lib/enums";
import { ReminderTierLabel, tierForOffset } from "@/lib/compliance/rules";
import { ComplianceKind, penaltyFor } from "@/lib/compliance/penalties";
import { getComplianceOverview } from "@/services/compliance";
import type { JobPayloads } from "../types";

// SLA reminder windows (local days before the deadline) for the RRA items.
const SLA_OFFSETS = [30, 14, 7] as const;

/** Map a compliance item kind to the in-app notification kind. */
function notificationKindFor(kind: string): string {
  switch (kind) {
    case ComplianceKind.HAZARD:
      return NotificationKind.HAZARD_SLA;
    case ComplianceKind.PET:
      return NotificationKind.PET_REQUEST_SLA;
    case ComplianceKind.DEPOSIT:
      return NotificationKind.DEPOSIT_PROTECTION_DUE;
    case ComplianceKind.RIGHT_TO_RENT:
      return NotificationKind.RIGHT_TO_RENT_EXPIRY;
    case ComplianceKind.OMBUDSMAN:
    case ComplianceKind.PRSD:
      return NotificationKind.REGISTRATION_RENEWAL;
    default:
      return NotificationKind.COMPLIANCE_OVERDUE;
  }
}

/**
 * Sweep the Renters' Rights Act SLAs — deposit protection, Right to Rent expiry,
 * Awaab's Law hazard deadlines, pet-request response windows, and ombudsman/PRSD
 * registration. Certificate *expiry* is handled by sendComplianceReminders (the
 * materialised DocumentReminder rows), so here we only alert certificate items
 * that are *missing* (no due date) to avoid double-notifying.
 *
 * For each account, gated on its local send hour, the unified RAG aggregator
 * yields the items needing attention; each fires escalating FIRST/SECOND/FINAL
 * warnings as its deadline approaches and a URGENT alert once overdue/missing —
 * deduped per (item, tier) so a recurring sweep delivers each step exactly once.
 */
export async function sendComplianceSlaWarnings(
  data: JobPayloads["sendComplianceSlaWarnings"],
) {
  const now = new Date();
  const accounts = await prisma.account.findMany({
    where: data.entityId ? { id: data.entityId } : {},
    select: { id: true, timeZone: true },
  });

  let dispatched = 0;
  for (const account of accounts) {
    if (!isAfterSendHour(now, account.timeZone)) continue;

    const overview = await getComplianceOverview(account.id, now);
    for (const item of overview.attention) {
      // Present certificates (with an expiry) are covered by the document sweep.
      if (item.category === "certificates" && item.dueDate) continue;

      let tier: ReturnType<typeof tierForOffset>;
      let dedupSuffix: string;

      if (item.dueDate) {
        const days = localDaysUntil(item.dueDate, now, account.timeZone);
        if (days < 0) {
          tier = "URGENT";
          dedupSuffix = "overdue";
        } else {
          const bucket = offsetBucket(days, SLA_OFFSETS);
          if (bucket === null) continue; // not yet inside the 30-day window
          tier = tierForOffset(bucket);
          dedupSuffix = `d${bucket}`;
        }
      } else {
        // A required item with no date on record (e.g. unregistered PRSD) — RED.
        tier = "URGENT";
        dedupSuffix = "missing";
      }

      const where = item.propertyLabel ?? "Portfolio-wide";
      const penalty = penaltyFor(item.kind);
      const result = await dispatchNotification({
        accountId: account.id,
        category: NotificationCategory.complianceReminders,
        kind: notificationKindFor(item.kind),
        title: `${ReminderTierLabel[tier]}: ${item.label}`,
        body: `${where} — ${item.detail}. ${penalty}`,
        href: item.href,
        dedupKey: `sla:${account.id}:${item.id}:${dedupSuffix}`,
        compliance: {
          tierLabel: ReminderTierLabel[tier],
          rag: tier === "URGENT" ? "RED" : "AMBER",
          itemLabel: item.label,
          propertyLabel: where,
          deadlineText: item.detail,
          penalty,
        },
      });
      if (result.channels.length > 0) dispatched++;
    }
  }

  console.log(
    `[jobs] sendComplianceSlaWarnings: ${accounts.length} account(s), ${dispatched} dispatched`,
  );
}
