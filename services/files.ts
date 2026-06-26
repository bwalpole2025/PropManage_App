import { prisma } from "@/lib/db";
import { daysUntil } from "@/lib/format";
import { ReminderState, RentStatus, TenancyStatus } from "@/lib/enums";

export async function getFilesAndDates(entityId: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const [compliance, reminders, files, rentDue] = await Promise.all([
    // Compliance docs = documents that have an expiry date.
    prisma.document.findMany({
      where: { accountId: entityId, expiryDate: { not: null } },
      include: { property: { select: { addressLine1: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    // User-facing reminders (renamed from ImportantDate).
    prisma.reminder.findMany({
      where: { accountId: entityId, status: ReminderState.OPEN },
      include: { property: { select: { addressLine1: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.fileObject.findMany({
      where: { accountId: entityId },
      include: { property: { select: { addressLine1: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Upcoming rent due dates (future, unpaid, active tenancies) — the calendar's
    // rent-due entries.
    prisma.rentScheduleEntry.findMany({
      where: {
        dueDate: { gte: today },
        status: { in: [RentStatus.DUE, RentStatus.PARTIAL, RentStatus.OVERDUE] },
        tenancy: {
          status: TenancyStatus.ACTIVE,
          property: { accountId: entityId },
        },
      },
      include: {
        tenancy: {
          select: {
            property: { select: { addressLine1: true } },
            tenants: {
              where: { isLeadTenant: true },
              take: 1,
              select: { name: true },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
    }),
  ]);

  // Bucket compliance by the reminder thresholds.
  const buckets = { overdue: 0, within7: 0, within14: 0, within30: 0, valid: 0 };
  for (const c of compliance) {
    const d = daysUntil(c.expiryDate!);
    if (d < 0) buckets.overdue++;
    else if (d <= 7) buckets.within7++;
    else if (d <= 14) buckets.within14++;
    else if (d <= 30) buckets.within30++;
    else buckets.valid++;
  }

  return { compliance, reminders, files, buckets, rentDue };
}
