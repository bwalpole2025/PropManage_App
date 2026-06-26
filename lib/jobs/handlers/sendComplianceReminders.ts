import { prisma } from "@/lib/db";
import { NotificationCategory } from "@/lib/notifications";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import {
  NotificationKind,
  ReminderStatus,
  resolveDocumentCategoryLabel,
} from "@/lib/enums";
import type { JobPayloads } from "../types";

/**
 * Fire due document-expiry reminders. The 30/14/7/1-day rows are pre-materialised
 * (DocumentReminder.fireOn) when the document is created. Any PENDING reminder
 * whose fireOn has passed is handed to the central dispatcher — which delivers it
 * on each channel the account has enabled for the `complianceReminders` category
 * (in-app, email, push), exactly once per channel — then is marked SENT so it
 * never re-fires. Disabling the category (or all of its channels) suppresses
 * delivery while still consuming the reminder, so a re-run stays a no-op.
 */
export async function sendComplianceReminders(
  data: JobPayloads["sendComplianceReminders"],
) {
  const now = new Date();
  const due = await prisma.documentReminder.findMany({
    where: {
      status: ReminderStatus.PENDING,
      fireOn: { lte: now },
      ...(data.entityId ? { document: { accountId: data.entityId } } : {}),
    },
    include: { document: { include: { property: true } } },
    take: 200,
  });

  if (due.length === 0) {
    console.log("[jobs] sendComplianceReminders: 0 due");
    return;
  }

  let dispatched = 0;
  for (const r of due) {
    const label = resolveDocumentCategoryLabel(r.document.category);
    const expiresOn =
      r.document.expiryDate?.toISOString().slice(0, 10) ?? "soon";

    const result = await dispatchNotification({
      accountId: r.document.accountId,
      category: NotificationCategory.complianceReminders,
      kind: NotificationKind.COMPLIANCE_EXPIRY,
      title: `${label} expires in ${r.offsetDays} day${
        r.offsetDays === 1 ? "" : "s"
      }`,
      body: `${
        r.document.property?.addressLine1 ?? "Portfolio-wide"
      } — expires ${expiresOn}`,
      href: "/files/documents",
      // The materialised reminder id is the natural once-per-offset dedup key.
      dedupKey: `doc-reminder:${r.id}`,
    });
    if (result.channels.length > 0) dispatched++;

    await prisma.documentReminder.update({
      where: { id: r.id },
      data: { status: ReminderStatus.SENT, sentAt: now },
    });
  }

  console.log(
    `[jobs] sendComplianceReminders: ${due.length} due, ${dispatched} dispatched`,
  );
}
