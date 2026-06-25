import { prisma } from "@/lib/db";
import { ReminderStatus } from "@/lib/enums";
import type { JobPayloads } from "../types";

/**
 * Fire due compliance reminders. The 30/14/7/1-day reminder rows are
 * pre-materialised (ComplianceReminder.fireOn). Any PENDING reminder whose
 * fireOn has passed is "sent" (logged via the mock notifier) and marked SENT.
 */
export async function sendComplianceReminders(
  data: JobPayloads["sendComplianceReminders"],
) {
  const due = await prisma.documentReminder.findMany({
    where: {
      status: ReminderStatus.PENDING,
      fireOn: { lte: new Date() },
      ...(data.entityId
        ? { document: { accountId: data.entityId } }
        : {}),
    },
    include: { document: { include: { property: true } } },
    take: 200,
  });

  for (const r of due) {
    // In production this would dispatch via the EmailSender; here we log.
    console.log(
      `[jobs] reminder: ${r.document.category} expires ${r.document.expiryDate
        ?.toISOString()
        .slice(0, 10)} (${r.offsetDays}d notice) for ${
        r.document.property?.addressLine1 ?? "portfolio"
      }`,
    );
    await prisma.documentReminder.update({
      where: { id: r.id },
      data: { status: ReminderStatus.SENT, sentAt: new Date() },
    });
  }

  console.log(`[jobs] sendComplianceReminders: ${due.length} reminder(s) sent`);
}
