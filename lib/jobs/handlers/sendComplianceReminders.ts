import { prisma } from "@/lib/db";
import {
  NotificationKind,
  ReminderStatus,
  resolveDocumentCategoryLabel,
} from "@/lib/enums";
import { parseNotificationPrefs } from "@/lib/notifications";
import { createForAccountUsers } from "@/lib/notifications/service";
import type { JobPayloads } from "../types";

/**
 * Fire due document-expiry reminders. The 30/14/7/1-day rows are pre-materialised
 * (DocumentReminder.fireOn). Any PENDING reminder whose fireOn has passed creates
 * an in-app notification for the account's users — but ONLY when that account has
 * compliance reminders enabled (notification preferences) — then is marked SENT.
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

  // Cache the compliance-reminders preference per account.
  const prefCache = new Map<string, boolean>();
  async function complianceEnabled(accountId: string): Promise<boolean> {
    const cached = prefCache.get(accountId);
    if (cached !== undefined) return cached;
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { notificationPrefs: true },
    });
    const on = parseNotificationPrefs(account?.notificationPrefs)
      .complianceReminders;
    prefCache.set(accountId, on);
    return on;
  }

  let notified = 0;
  for (const r of due) {
    const accountId = r.document.accountId;
    if (await complianceEnabled(accountId)) {
      const label = resolveDocumentCategoryLabel(r.document.category);
      const expiresOn =
        r.document.expiryDate?.toISOString().slice(0, 10) ?? "soon";
      await createForAccountUsers({
        accountId,
        kind: NotificationKind.COMPLIANCE_EXPIRY,
        title: `${label} expires in ${r.offsetDays} day${
          r.offsetDays === 1 ? "" : "s"
        }`,
        body: `${
          r.document.property?.addressLine1 ?? "Portfolio-wide"
        } — expires ${expiresOn}`,
        href: "/files/documents",
      });
      notified++;
    }
    await prisma.documentReminder.update({
      where: { id: r.id },
      data: { status: ReminderStatus.SENT, sentAt: now },
    });
  }

  console.log(
    `[jobs] sendComplianceReminders: ${due.length} due, ${notified} notification(s) created`,
  );
}
