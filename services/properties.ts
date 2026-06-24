import { prisma } from "@/lib/db";
import { TenancyStatus, TxnDirection } from "@/lib/enums";

export interface PropertyListItem {
  id: string;
  addressLine1: string;
  city: string;
  postcode: string;
  propertyType: string;
  activeTenancies: number;
  monthlyRentPence: number;
  hasArrears: boolean;
  complianceDueSoon: number;
}

/** Properties for an entity with summary stats for the list view. */
export async function listProperties(
  entityId: string,
): Promise<PropertyListItem[]> {
  const properties = await prisma.property.findMany({
    where: { landlordEntityId: entityId, archivedAt: null },
    include: {
      tenancies: {
        include: {
          rentSchedule: {
            where: { status: { in: ["OVERDUE", "PARTIAL"] } },
            select: { id: true },
          },
        },
      },
      complianceDocs: {
        where: { expiryDate: { lte: new Date(Date.now() + 30 * 86400000) } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return properties.map((p) => {
    const active = p.tenancies.filter((t) => t.status === TenancyStatus.ACTIVE);
    const monthly = active.reduce((sum, t) => {
      // normalise to a monthly figure
      const perYear = { WEEKLY: 52, FORTNIGHTLY: 26, MONTHLY: 12, QUARTERLY: 4, ANNUALLY: 1 }[
        t.rentFrequency as "MONTHLY"
      ] ?? 12;
      return sum + Math.round((t.rentPence * perYear) / 12);
    }, 0);
    const hasArrears = p.tenancies.some((t) => t.rentSchedule.length > 0);
    return {
      id: p.id,
      addressLine1: p.addressLine1,
      city: p.city,
      postcode: p.postcode,
      propertyType: p.propertyType,
      activeTenancies: active.length,
      monthlyRentPence: monthly,
      hasArrears,
      complianceDueSoon: p.complianceDocs.length,
    };
  });
}

/** Full property detail, scoped to the entity (returns null if not found). */
export async function getProperty(entityId: string, propertyId: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, landlordEntityId: entityId },
    include: {
      tenancies: {
        include: { tenants: true, rentSchedule: { orderBy: { dueDate: "desc" }, take: 6 } },
        orderBy: { startDate: "desc" },
      },
      transactions: { orderBy: { date: "desc" }, take: 10 },
      complianceDocs: { orderBy: { expiryDate: "asc" } },
      ownershipShares: { include: { owner: true } },
    },
  });
  if (!property) return null;

  const incomePence = property.transactions
    .filter((t) => t.direction === TxnDirection.INCOME)
    .reduce((s, t) => s + t.amountPence, 0);
  const expensePence = property.transactions
    .filter((t) => t.direction === TxnDirection.EXPENSE)
    .reduce((s, t) => s + t.amountPence, 0);

  return {
    ...property,
    reminderOffsets: property.complianceDocs.map((c) => c.reminderOffsetsDays),
    summary: { incomePence, expensePence },
  };
}

/** Owners belonging to an entity (for ownership-split selection). */
export async function listOwners(entityId: string) {
  return prisma.owner.findMany({
    where: { landlordEntityId: entityId },
    orderBy: { legalName: "asc" },
  });
}
