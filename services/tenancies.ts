import { prisma } from "@/lib/db";
import { RentStatus, TenancyStatus } from "@/lib/enums";
import { firstFutureDueDate } from "@/lib/rent";

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

export interface TenancyRow {
  id: string;
  leadTenantName: string;
  leadTenantEmail: string | null;
  propertyId: string;
  propertyAddress: string;
  propertyPostcode: string;
  status: string;
  rentPence: number;
  rentFrequency: string;
  rentDueDay: number | null;
  depositPence: number | null;
  depositScheme: string | null;
  startDate: Date;
  endDate: Date | null;
  nextPaymentDate: Date | null;
  tracked: boolean;
  arrearsPence: number;
  creditPence: number;
}

/**
 * Tenancy rows for the Tenancies screen — filtered (search / property / status,
 * default ACTIVE) and sorted (tenant A–Z). Each row carries the derived next
 * payment date, deposit, dates, rent and credit/arrears (or "untracked" when no
 * rent schedule exists). Scoped via property.accountId.
 */
export async function getTenanciesScreen(
  entityId: string,
  opts: { q?: string; property?: string; status?: string; sort?: string } = {},
): Promise<TenancyRow[]> {
  const status = opts.status ?? TenancyStatus.ACTIVE;
  const now = new Date();
  const tenancies = await prisma.tenancy.findMany({
    where: {
      property: { accountId: entityId },
      archivedAt: null,
      ...(status !== "all" ? { status } : {}),
      ...(opts.property ? { propertyId: opts.property } : {}),
    },
    include: {
      property: { select: { id: true, addressLine1: true, postcode: true } },
      tenants: { orderBy: { isLeadTenant: "desc" }, take: 1 },
      rentSchedule: {
        where: { status: { in: [RentStatus.OVERDUE, RentStatus.PARTIAL] } },
        select: { expectedPence: true, receivedPence: true },
      },
      _count: { select: { rentSchedule: true } },
    },
    orderBy: { startDate: "desc" },
  });

  let rows: TenancyRow[] = tenancies.map((t) => {
    const lead = t.tenants[0];
    const arrearsPence = t.rentSchedule.reduce(
      (s, r) => s + Math.max(0, r.expectedPence - r.receivedPence),
      0,
    );
    return {
      id: t.id,
      leadTenantName: lead?.name ?? "—",
      leadTenantEmail: lead?.email ?? null,
      propertyId: t.propertyId,
      propertyAddress: t.property.addressLine1,
      propertyPostcode: t.property.postcode,
      status: t.status,
      rentPence: t.rentPence,
      rentFrequency: t.rentFrequency,
      rentDueDay: t.rentDueDay,
      depositPence: t.depositPence,
      depositScheme: t.depositScheme,
      startDate: t.startDate,
      endDate: t.endDate,
      // endDate-aware → null for ended tenancies (no phantom next payment).
      nextPaymentDate: firstFutureDueDate(
        {
          startDate: t.startDate,
          rentFrequency: t.rentFrequency,
          rentDueDay: t.rentDueDay,
          endDate: t.endDate,
        },
        now,
      ),
      tracked: t._count.rentSchedule > 0,
      arrearsPence,
      creditPence: t.balancePence > 0 ? t.balancePence : 0,
    };
  });

  if (opts.q?.trim()) {
    const q = opts.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.leadTenantName.toLowerCase().includes(q) ||
        r.propertyAddress.toLowerCase().includes(q),
    );
  }

  rows.sort((a, b) => a.leadTenantName.localeCompare(b.leadTenantName));
  return rows;
}
