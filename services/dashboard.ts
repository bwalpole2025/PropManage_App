import { prisma } from "@/lib/db";
import { LandlordType, RentStatus, TenancyStatus, TxnDirection, TxnStatus } from "@/lib/enums";
import { taxYearEndDate, taxYearLabelFor, taxYearStartDate } from "@/lib/format";
import { services } from "@/lib/services";
import { getEntity, getTaxYearTxns } from "./shared";

export interface DashboardData {
  entityId: string;
  taxYear: string;
  onboarding: {
    hasProperty: boolean;
    hasTenancy: boolean;
    hasTransaction: boolean;
    transactionCount: number;
    emailUnverified: boolean;
  };
  kpis: {
    incomePence: number;
    expensesPence: number;
    netPence: number;
    arrearsPence: number;
  };
  arrears: ArrearsRow[];
  compliance: ComplianceRow[];
  tax: {
    estimatedTaxPence: number;
    taxableProfitPence: number;
    disclaimer: string;
  };
}

export interface ArrearsRow {
  tenancyId: string;
  propertyId: string;
  propertyLabel: string;
  tenantName: string;
  dueDate: Date;
  shortfallPence: number;
  status: string;
}

export interface ComplianceRow {
  id: string;
  type: string;
  propertyLabel: string | null;
  expiryDate: Date;
}

export async function getDashboardData(
  entityId: string,
  userId?: string,
): Promise<DashboardData> {
  const taxYear = taxYearLabelFor();
  const start = taxYearStartDate(taxYear);
  const end = taxYearEndDate(taxYear);
  const entity = await getEntity(entityId);

  const [propertyCount, tenancyCount, txnCount, txns, schedule, compliance, user] =
    await Promise.all([
      prisma.property.count({ where: { accountId: entityId } }),
      prisma.tenancy.count({
        where: { property: { accountId: entityId } },
      }),
      prisma.transaction.count({ where: { accountId: entityId } }),
      prisma.transaction.findMany({
        where: {
          accountId: entityId,
          date: { gte: start, lte: end },
          status: { not: TxnStatus.EXCLUDED },
        },
        select: { direction: true, amountPence: true },
      }),
      prisma.rentScheduleEntry.findMany({
        where: {
          tenancy: {
            status: TenancyStatus.ACTIVE,
            property: { accountId: entityId },
          },
          status: { in: [RentStatus.OVERDUE, RentStatus.PARTIAL] },
        },
        include: {
          tenancy: {
            include: {
              property: true,
              tenants: { where: { isLeadTenant: true }, take: 1 },
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.document.findMany({
        where: {
          accountId: entityId,
          expiryDate: { not: null, lte: new Date(Date.now() + 45 * 86400000) },
        },
        include: { property: true },
        orderBy: { expiryDate: "asc" },
        take: 6,
      }),
      userId
        ? prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true },
          })
        : Promise.resolve(null),
    ]);

  const incomePence = txns
    .filter((t) => t.direction === TxnDirection.INCOME)
    .reduce((s, t) => s + t.amountPence, 0);
  const expensesPence = txns
    .filter((t) => t.direction === TxnDirection.EXPENSE)
    .reduce((s, t) => s + t.amountPence, 0);

  const arrears: ArrearsRow[] = schedule.map((e) => ({
    tenancyId: e.tenancyId,
    propertyId: e.tenancy.propertyId,
    propertyLabel: e.tenancy.property.addressLine1,
    tenantName: e.tenancy.tenants[0]?.name ?? "Tenant",
    dueDate: e.dueDate,
    shortfallPence: e.expectedPence - e.receivedPence,
    status: e.status,
  }));
  const arrearsPence = arrears.reduce((s, a) => s + a.shortfallPence, 0);

  // Tax snapshot from this tax year's categorised transactions.
  const estimateTxns = await getTaxYearTxns(entityId, taxYear);
  const estimate = services.tax.estimate({
    entityId,
    taxYear,
    transactions: estimateTxns,
    options: { landlordType: entity.type as LandlordType },
  });

  return {
    entityId,
    taxYear,
    onboarding: {
      hasProperty: propertyCount > 0,
      hasTenancy: tenancyCount > 0,
      hasTransaction: txnCount > 0,
      transactionCount: txnCount,
      emailUnverified: userId ? !user?.emailVerified : false,
    },
    kpis: {
      incomePence,
      expensesPence,
      netPence: incomePence - expensesPence,
      arrearsPence,
    },
    arrears,
    compliance: compliance.map((c) => ({
      id: c.id,
      type: c.category,
      propertyLabel: c.property?.addressLine1 ?? null,
      expiryDate: c.expiryDate!,
    })),
    tax: {
      estimatedTaxPence: estimate.estimatedTaxPence,
      taxableProfitPence: estimate.taxableProfitPence,
      disclaimer: estimate.disclaimer,
    },
  };
}
