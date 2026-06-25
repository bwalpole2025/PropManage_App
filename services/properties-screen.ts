import { prisma } from "@/lib/db";
import { TenancyStatus, TxnDirection, TxnStatus } from "@/lib/enums";
import { taxYearEndDate, taxYearStartDate } from "@/lib/format";
import { loanToValueBp } from "@/lib/finance";
import {
  normaliseMonthlyRentPence,
  occupancyOf,
  type OccupancyStatus,
} from "@/lib/property-finance";

export interface PropertyCardRow {
  id: string;
  addressLine1: string;
  city: string;
  postcode: string;
  occupancyStatus: OccupancyStatus;
  monthlyRentPence: number;
  portfolioName: string;
  taxYearStart: Date;
  incomePence: number;
  expensePence: number;
  profitPence: number;
  arrearsPence: number; // point-in-time current shortfall (NOT tax-year scoped)
}

export interface PropertiesScreenData {
  summary: {
    portfolioCount: number;
    propertyCount: number;
    tenancyCount: number;
    vacantCount: number;
    creditPence: number;
    arrearsPence: number;
  };
  portfolios: { id: string; name: string }[];
  properties: PropertyCardRow[];
  tenancyOptions: { id: string; label: string }[];
}

/** Summary + filtered/sorted property cards for the Properties screen. */
export async function getPropertiesScreen(
  entityId: string,
  opts: { portfolioId?: string; taxYear: string; sort?: string },
): Promise<PropertiesScreenData> {
  const start = taxYearStartDate(opts.taxYear);
  // Exclusive upper bound = start of the day AFTER 5 Apr, so transactions dated
  // any time on 5 Apr (e.g. bank-feed/import timestamps) are included.
  const endExclusive = new Date(taxYearEndDate(opts.taxYear).getTime() + 86_400_000);
  const propWhere = {
    accountId: entityId,
    archivedAt: null,
    ...(opts.portfolioId ? { portfolioId: opts.portfolioId } : {}),
  };

  const [properties, grouped, portfolioCount, portfolios] = await Promise.all([
    prisma.property.findMany({
      where: propWhere,
      include: {
        portfolio: { select: { name: true } },
        tenancies: {
          select: {
            id: true,
            status: true,
            rentPence: true,
            rentFrequency: true,
            balancePence: true,
            tenants: {
              where: { isLeadTenant: true },
              select: { name: true },
              take: 1,
            },
            rentSchedule: {
              where: { status: { in: ["OVERDUE", "PARTIAL"] } },
              select: { expectedPence: true, receivedPence: true },
            },
          },
        },
      },
    }),
    // One grouped aggregate for per-property income/expense in the tax-year window.
    prisma.transaction.groupBy({
      by: ["propertyId", "direction"],
      where: {
        accountId: entityId,
        propertyId: { not: null },
        date: { gte: start, lt: endExclusive },
        status: { not: TxnStatus.EXCLUDED },
      },
      _sum: { amountPence: true },
    }),
    prisma.portfolio.count({ where: { accountId: entityId } }),
    prisma.portfolio.findMany({
      where: { accountId: entityId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const finByProp = new Map<string, { income: number; expense: number }>();
  for (const g of grouped) {
    if (!g.propertyId) continue;
    const e = finByProp.get(g.propertyId) ?? { income: 0, expense: 0 };
    const amt = g._sum.amountPence ?? 0;
    if (g.direction === TxnDirection.INCOME) e.income += amt;
    else if (g.direction === TxnDirection.EXPENSE) e.expense += amt;
    finByProp.set(g.propertyId, e);
  }

  let tenancyCount = 0;
  let vacantCount = 0;
  let arrearsTotal = 0;
  let creditTotal = 0;
  const tenancyOptions: { id: string; label: string }[] = [];

  const rows: PropertyCardRow[] = properties.map((p) => {
    const active = p.tenancies.filter((t) => t.status === TenancyStatus.ACTIVE);
    tenancyCount += active.length;
    const occupancyStatus = occupancyOf(p.tenancies);
    if (occupancyStatus === "Vacant") vacantCount += 1;

    const arrearsPence = active.reduce(
      (s, t) =>
        s +
        t.rentSchedule.reduce(
          (ss, r) => ss + Math.max(0, r.expectedPence - r.receivedPence),
          0,
        ),
      0,
    );
    arrearsTotal += arrearsPence;
    creditTotal += active.reduce((s, t) => s + Math.max(0, t.balancePence), 0);

    for (const t of active) {
      tenancyOptions.push({
        id: t.id,
        label: `${t.tenants[0]?.name ?? "Tenant"} · ${p.addressLine1}`,
      });
    }

    const fin = finByProp.get(p.id) ?? { income: 0, expense: 0 };
    return {
      id: p.id,
      addressLine1: p.addressLine1,
      city: p.city,
      postcode: p.postcode,
      occupancyStatus,
      monthlyRentPence: normaliseMonthlyRentPence(p.tenancies),
      portfolioName: p.portfolio.name,
      taxYearStart: start,
      incomePence: fin.income,
      expensePence: fin.expense,
      profitPence: fin.income - fin.expense,
      arrearsPence,
    };
  });

  rows.sort((a, b) => a.addressLine1.localeCompare(b.addressLine1));

  return {
    summary: {
      portfolioCount,
      propertyCount: rows.length,
      tenancyCount,
      vacantCount,
      creditPence: creditTotal,
      arrearsPence: arrearsTotal,
    },
    portfolios,
    properties: rows,
    tenancyOptions,
  };
}

export interface InsuranceRow {
  id: string;
  propertyId: string;
  propertyLabel: string;
  type: string;
  provider: string;
  policyNumber: string | null;
  expiryDate: Date | null;
  premiumPence: number | null;
}

export async function listInsurance(
  entityId: string,
  opts: { portfolioId?: string } = {},
): Promise<InsuranceRow[]> {
  const policies = await prisma.insurancePolicy.findMany({
    where: {
      accountId: entityId,
      archivedAt: null,
      property: {
        archivedAt: null,
        ...(opts.portfolioId ? { portfolioId: opts.portfolioId } : {}),
      },
    },
    include: { property: { select: { id: true, addressLine1: true } } },
    orderBy: { expiryDate: "asc" },
  });
  return policies.map((p) => ({
    id: p.id,
    propertyId: p.propertyId,
    propertyLabel: p.property.addressLine1,
    type: p.type,
    provider: p.provider,
    policyNumber: p.policyNumber,
    expiryDate: p.expiryDate,
    premiumPence: p.premiumPence,
  }));
}

export interface MortgageRow {
  id: string;
  propertyId: string;
  propertyLabel: string;
  lender: string;
  balancePence: number;
  monthlyPaymentPence: number;
  interestRateBp: number;
  productType: string;
  fixedUntil: Date | null;
  ltvBp: number | null;
}

export async function listMortgages(
  entityId: string,
  opts: { portfolioId?: string } = {},
): Promise<MortgageRow[]> {
  const mortgages = await prisma.mortgage.findMany({
    where: {
      accountId: entityId,
      archivedAt: null,
      property: {
        archivedAt: null,
        ...(opts.portfolioId ? { portfolioId: opts.portfolioId } : {}),
      },
    },
    include: {
      property: { select: { addressLine1: true, currentValuePence: true } },
    },
    orderBy: { lender: "asc" },
  });
  return mortgages.map((m) => ({
    id: m.id,
    propertyId: m.propertyId,
    propertyLabel: m.property.addressLine1,
    lender: m.lender,
    balancePence: m.balancePence,
    monthlyPaymentPence: m.monthlyPaymentPence,
    interestRateBp: m.interestRateBp,
    productType: m.productType,
    fixedUntil: m.fixedUntil,
    ltvBp: loanToValueBp(m.balancePence, m.property.currentValuePence),
  }));
}
