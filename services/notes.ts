import { prisma } from "@/lib/db";

/** Account-wide notes, newest first. */
export async function listNotes(entityId: string) {
  return prisma.note.findMany({
    where: { accountId: entityId },
    include: {
      property: { select: { addressLine1: true } },
      tenant: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
}
