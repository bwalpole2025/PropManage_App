import { prisma } from "@/lib/db";
import { daysUntil } from "@/lib/format";

export async function getFilesAndDates(entityId: string) {
  const [compliance, importantDates, files] = await Promise.all([
    prisma.complianceDocument.findMany({
      where: { landlordEntityId: entityId },
      include: { property: { select: { addressLine1: true } } },
      orderBy: { expiryDate: "asc" },
    }),
    prisma.importantDate.findMany({
      where: { landlordEntityId: entityId },
      include: { property: { select: { addressLine1: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.fileObject.findMany({
      where: { landlordEntityId: entityId },
      include: { property: { select: { addressLine1: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Bucket compliance by the reminder thresholds.
  const buckets = { overdue: 0, within7: 0, within14: 0, within30: 0, valid: 0 };
  for (const c of compliance) {
    const d = daysUntil(c.expiryDate);
    if (d < 0) buckets.overdue++;
    else if (d <= 7) buckets.within7++;
    else if (d <= 14) buckets.within14++;
    else if (d <= 30) buckets.within30++;
    else buckets.valid++;
  }

  return { compliance, importantDates, files, buckets };
}
