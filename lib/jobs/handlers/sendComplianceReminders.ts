import { prisma } from "@/lib/db";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  COMPLIANCE_CATEGORIES,
  NotificationKind,
  ReminderStatus,
  resolveDocumentCategoryLabel,
} from "@/lib/enums";
import {
  ReminderTierLabel,
  tierForOffset,
  DAY_MS,
} from "@/lib/compliance/rules";
import { ComplianceKind, penaltyFor } from "@/lib/compliance/penalties";
import type { JobPayloads } from "../types";

/** Map a document category to the penalty "kind" (gas/eicr/epc vs generic cert). */
function kindForCategory(category: string): string {
  if (category === "GAS_SAFETY") return ComplianceKind.GAS_SAFETY;
  if (category === "EICR") return ComplianceKind.EICR;
  if (category === "EPC") return ComplianceKind.EPC;
  return ComplianceKind.CERTIFICATE;
}

/**
 * Fire document-expiry reminders. Two passes, both idempotent via the dispatch
 * ledger:
 *
 *  1. Pre-expiry: the 30/14/7/1-day rows pre-materialised on the Document
 *     (DocumentReminder.fireOn) escalate FIRST → SECOND → FINAL warning and carry
 *     the penalty for that certificate. Each row fires once then is marked SENT.
 *  2. Overdue (RED): a compliance certificate whose expiry has just passed gets a
 *     one-off "URGENT: compliance breach" alert (deduped on the expiry date), so a
 *     lapse is escalated rather than going silent after the 1-day nudge.
 */
export async function sendComplianceReminders(
  data: JobPayloads["sendComplianceReminders"],
) {
  const now = new Date();
  let dispatched = 0;

  // --- Pass 1: pre-expiry materialised reminders ---
  const due = await prisma.documentReminder.findMany({
    where: {
      status: ReminderStatus.PENDING,
      fireOn: { lte: now },
      ...(data.entityId ? { document: { accountId: data.entityId } } : {}),
    },
    include: { document: { include: { property: true } } },
    take: 200,
  });

  for (const r of due) {
    const label = resolveDocumentCategoryLabel(r.document.category);
    const expiresOn = r.document.expiryDate?.toISOString().slice(0, 10) ?? "soon";
    const tier = tierForOffset(r.offsetDays);
    const where = r.document.property?.addressLine1 ?? "Portfolio-wide";

    const penalty = penaltyFor(kindForCategory(r.document.category));
    const result = await dispatchNotification({
      accountId: r.document.accountId,
      category: NotificationCategory.complianceReminders,
      kind: NotificationKind.COMPLIANCE_EXPIRY,
      title: `${ReminderTierLabel[tier]}: ${label} expires in ${r.offsetDays} day${
        r.offsetDays === 1 ? "" : "s"
      }`,
      body: `${where} — ${label} expires ${expiresOn}. ${penalty}`,
      href: "/compliance",
      dedupKey: `doc-reminder:${r.id}`,
      compliance: {
        tierLabel: ReminderTierLabel[tier],
        rag: "AMBER",
        itemLabel: label,
        propertyLabel: where,
        deadlineText: `Expires ${expiresOn} (in ${r.offsetDays} day${
          r.offsetDays === 1 ? "" : "s"
        })`,
        penalty,
      },
    });
    if (result.channels.length > 0) dispatched++;

    await prisma.documentReminder.update({
      where: { id: r.id },
      data: { status: ReminderStatus.SENT, sentAt: now },
    });
  }

  // --- Pass 2: recently-lapsed certificates (overdue / RED) ---
  const lapsed = await prisma.document.findMany({
    where: {
      category: { in: COMPLIANCE_CATEGORIES },
      expiryDate: { lt: now, gte: new Date(now.getTime() - 60 * DAY_MS) },
      ...(data.entityId ? { accountId: data.entityId } : {}),
    },
    include: { property: true },
    take: 200,
  });

  for (const doc of lapsed) {
    const label = resolveDocumentCategoryLabel(doc.category);
    const expiredOn = doc.expiryDate!.toISOString().slice(0, 10);
    const where = doc.property?.addressLine1 ?? "Portfolio-wide";
    const penalty = penaltyFor(kindForCategory(doc.category));
    const result = await dispatchNotification({
      accountId: doc.accountId,
      category: NotificationCategory.complianceReminders,
      kind: NotificationKind.COMPLIANCE_OVERDUE,
      title: `URGENT: ${label} has expired`,
      body: `${where} — ${label} expired ${expiredOn}. ${penalty}`,
      href: "/compliance",
      // Once per certificate per expiry date — survives renewals (new expiry → new key).
      dedupKey: `doc-overdue:${doc.id}:${expiredOn}`,
      compliance: {
        tierLabel: "URGENT: compliance breach",
        rag: "RED",
        itemLabel: label,
        propertyLabel: where,
        deadlineText: `Expired ${expiredOn}`,
        penalty,
      },
    });
    if (result.channels.length > 0) dispatched++;
  }

  console.log(
    `[jobs] sendComplianceReminders: ${due.length} pre-expiry, ${lapsed.length} lapsed, ${dispatched} dispatched`,
  );
}
