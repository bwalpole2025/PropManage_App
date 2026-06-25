import { prisma } from "@/lib/db";

/** Beneficial owners for the account, with their current property holdings. */
export async function listOwnership(entityId: string) {
  return prisma.beneficialOwner.findMany({
    where: { accountId: entityId },
    include: {
      ownerships: {
        where: { effectiveTo: null },
        include: { property: { select: { addressLine1: true } } },
        orderBy: { ownershipPercentageBp: "desc" },
      },
    },
    orderBy: { legalName: "asc" },
  });
}
