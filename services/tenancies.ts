import { prisma } from "@/lib/db";

/** Account-wide tenancies (Tenancy is scoped via its property's account). */
export async function listTenancies(entityId: string) {
  return prisma.tenancy.findMany({
    where: { property: { accountId: entityId }, archivedAt: null },
    include: {
      property: { select: { addressLine1: true, postcode: true } },
      tenants: { orderBy: { isLeadTenant: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
}
