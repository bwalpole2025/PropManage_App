// Rental reports: Rent Received, Rent Roll and Tenant Ledger. These read
// tenancy / tenant / rent-schedule data (scoped by portfolio via the property)
// rather than the raw transaction stream.

import { prisma } from "@/lib/db";
import { TenancyStatus, RentFrequencyLabel, type RentFrequency } from "@/lib/enums";
import { Sa105Category } from "@/lib/sa105";
import { annualisedRentPence } from "@/lib/finance";
import { formatDate } from "@/lib/format";
import type { ReportFilters } from "@/lib/reports/filters";
import type { ReportDocument, ReportRow, ReportSection } from "@/lib/reports/types";
import {
  getReportEntity,
  getScopedTransactions,
  resolvePortfolioScope,
  type PortfolioScope,
} from "./data";
import { standardMeta, standardSubtitle } from "./_shared";

const ARREARS_LABEL: Record<string, string> = {
  CURRENT: "Current",
  ARREARS: "In arrears",
  CREDIT: "In credit",
};
const RENT_STATUS_LABEL: Record<string, string> = {
  PAID: "Paid",
  PARTIAL: "Part paid",
  OVERDUE: "Overdue",
  DUE: "Due",
  WAIVED: "Waived",
};

/** Prisma where-fragment limiting tenancies to the portfolio scope (via property). */
function tenancyPropertyWhere(entityId: string, scope: PortfolioScope) {
  return scope.propertyIds === null
    ? { accountId: entityId }
    : { accountId: entityId, id: { in: scope.propertyIds } };
}

// ---------------------------------------------------------------------------
// Rent Received — rent received by tenant, dated by rent due date.
// ---------------------------------------------------------------------------

export async function buildRentReceived(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const [entity, scope] = await Promise.all([
    getReportEntity(entityId),
    resolvePortfolioScope(entityId, filters.portfolioId),
  ]);

  // Fetch all rent-income txns in scope (ignore the txn-date window) then filter
  // by the rent due date they satisfy (falling back to the transaction date).
  const allRent = await getScopedTransactions(entityId, {
    filters: { ...filters, period: { ...filters.period, from: null, to: null } },
    scope,
    category: Sa105Category.RENT_INCOME,
  });
  const { from, to } = filters.period;
  const inWindow = (d: Date) => (!from || d >= from) && (!to || d <= to);
  const rent = allRent
    .map((t) => ({ ...t, effectiveDate: t.rentDueDate ?? t.date }))
    .filter((t) => inWindow(t.effectiveDate))
    .sort((a, b) => a.effectiveDate.getTime() - b.effectiveDate.getTime());

  // Per-tenant roll-up keyed by tenancy (fallback to property when unlinked).
  const byTenant = new Map<string, { tenant: string; property: string; count: number; total: number }>();
  for (const t of rent) {
    const key = t.tenancyId ?? t.propertyId ?? "unlinked";
    const tenant = t.tenantName ?? "Unlinked rent";
    const property = t.propertyLabel ?? "—";
    const row = byTenant.get(key) ?? { tenant, property, count: 0, total: 0 };
    row.count += 1;
    row.total += t.amountPence;
    byTenant.set(key, row);
  }
  const tenantRows: ReportRow[] = [...byTenant.values()]
    .sort((a, b) => b.total - a.total)
    .map((r) => ({ tenant: r.tenant, property: r.property, count: r.count, total: r.total }));

  const detailRows: ReportRow[] = rent.map((t) => ({
    due: t.effectiveDate,
    tenant: t.tenantName ?? "—",
    property: t.propertyLabel ?? "—",
    amount: t.amountPence,
  }));

  const total = rent.reduce((s, t) => s + t.amountPence, 0);

  return {
    slug: "rent-received",
    title: "Rent Received",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Rent received", pence: total, tone: "income", emphasis: true },
          { label: "Payments", text: String(rent.length) },
          { label: "Tenants", text: String(byTenant.size) },
        ],
      },
      {
        title: "By tenant",
        tables: [
          {
            columns: [
              { key: "tenant", label: "Tenant" },
              { key: "property", label: "Property" },
              { key: "count", label: "Payments", type: "number" },
              { key: "total", label: "Total received", type: "currency" },
            ],
            rows: tenantRows,
            totals: { tenant: "Total", property: null, count: rent.length, total },
            emptyText: "No rent received in this period.",
          },
        ],
      },
      {
        title: "Payments",
        tables: [
          {
            columns: [
              { key: "due", label: "Rent due date", type: "date" },
              { key: "tenant", label: "Tenant" },
              { key: "property", label: "Property" },
              { key: "amount", label: "Amount", type: "currency" },
            ],
            rows: detailRows,
            totals: { due: null, tenant: null, property: "Total", amount: total },
            emptyText: "No rent received in this period.",
            note: "Each payment is dated by the rent due date it satisfies, falling back to the payment date.",
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Rent Roll — snapshot of all active tenancies and their details.
// ---------------------------------------------------------------------------

export async function buildRentRoll(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const [entity, scope] = await Promise.all([
    getReportEntity(entityId),
    resolvePortfolioScope(entityId, filters.portfolioId),
  ]);

  const tenancies = await prisma.tenancy.findMany({
    where: {
      status: TenancyStatus.ACTIVE,
      property: tenancyPropertyWhere(entityId, scope),
    },
    include: {
      property: { select: { addressLine1: true, portfolio: { select: { name: true } } } },
      tenants: { orderBy: { isLeadTenant: "desc" }, select: { name: true, isLeadTenant: true } },
    },
    orderBy: { startDate: "asc" },
  });

  let totalAnnual = 0;
  let totalDeposits = 0;
  const rows: ReportRow[] = tenancies.map((t) => {
    const annual = annualisedRentPence(t.rentPence, t.rentFrequency as RentFrequency);
    totalAnnual += annual;
    totalDeposits += t.depositPence ?? 0;
    const tenantNames = t.tenants.map((x) => x.name).join(", ") || "—";
    return {
      property: t.property.addressLine1,
      tenant: tenantNames,
      start: t.startDate,
      rent: t.rentPence,
      frequency: RentFrequencyLabel[t.rentFrequency as RentFrequency] ?? t.rentFrequency,
      annual,
      deposit: t.depositPence ?? undefined,
      arrears: ARREARS_LABEL[t.arrearsState] ?? t.arrearsState,
    };
  });

  return {
    slug: "rent-roll",
    title: "Rent Roll",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, {
      portfolioName: scope.name,
      periodLine: `As at: ${formatDate(new Date())}`,
    }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Active tenancies", text: String(tenancies.length) },
          { label: "Annualised rent", pence: totalAnnual, tone: "income", emphasis: true },
          { label: "Deposits held", pence: totalDeposits },
        ],
      },
      {
        title: "Tenancies",
        tables: [
          {
            columns: [
              { key: "property", label: "Property" },
              { key: "tenant", label: "Tenant(s)" },
              { key: "start", label: "Start", type: "date" },
              { key: "rent", label: "Rent", type: "currency" },
              { key: "frequency", label: "Frequency" },
              { key: "annual", label: "Annual rent", type: "currency" },
              { key: "deposit", label: "Deposit", type: "currency" },
              { key: "arrears", label: "Status" },
            ],
            rows,
            totals: {
              property: "Total",
              tenant: null,
              start: null,
              rent: null,
              frequency: null,
              annual: totalAnnual,
              deposit: totalDeposits,
              arrears: null,
            },
            emptyText: "No active tenancies in this portfolio.",
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tenant Ledger — payments and missed payments per tenant.
// ---------------------------------------------------------------------------

export async function buildTenantLedger(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const [entity, scope] = await Promise.all([
    getReportEntity(entityId),
    resolvePortfolioScope(entityId, filters.portfolioId),
  ]);
  const { from, to } = filters.period;
  const inWindow = (d: Date) => (!from || d >= from) && (!to || d <= to);

  const tenancies = await prisma.tenancy.findMany({
    where: { property: tenancyPropertyWhere(entityId, scope) },
    include: {
      property: { select: { addressLine1: true } },
      tenants: { orderBy: { isLeadTenant: "desc" }, select: { name: true }, take: 1 },
      rentSchedule: { orderBy: { dueDate: "asc" } },
    },
    orderBy: { startDate: "asc" },
  });

  // Rent payments per tenancy, for tenancies with no rent schedule.
  const rentTxns = await getScopedTransactions(entityId, {
    filters,
    scope,
    category: Sa105Category.RENT_INCOME,
  });
  const paymentsByTenancy = new Map<string, typeof rentTxns>();
  for (const t of rentTxns) {
    if (!t.tenancyId) continue;
    const arr = paymentsByTenancy.get(t.tenancyId) ?? [];
    arr.push(t);
    paymentsByTenancy.set(t.tenancyId, arr);
  }

  let grandCharged = 0;
  let grandReceived = 0;
  let grandMissed = 0;
  const tenantSections: ReportSection[] = [];

  for (const ten of tenancies) {
    const tenant = ten.tenants[0]?.name ?? "Tenant";
    const heading = `${tenant} · ${ten.property.addressLine1}`;
    const schedule = ten.rentSchedule.filter((e) => inWindow(e.dueDate));

    if (schedule.length > 0) {
      let balance = 0;
      let charged = 0;
      let received = 0;
      let missed = 0;
      const rows: ReportRow[] = schedule.map((e) => {
        const shortfall = Math.max(0, e.expectedPence - e.receivedPence);
        balance += e.receivedPence - e.expectedPence;
        charged += e.expectedPence;
        received += e.receivedPence;
        if (shortfall > 0) missed += 1;
        return {
          due: e.dueDate,
          charge: e.expectedPence,
          paid: e.receivedPence,
          shortfall: shortfall || undefined,
          balance,
          status: RENT_STATUS_LABEL[e.status] ?? e.status,
        };
      });
      grandCharged += charged;
      grandReceived += received;
      grandMissed += missed;
      tenantSections.push({
        title: heading,
        summary: [
          { label: "Rent charged", pence: charged },
          { label: "Rent received", pence: received, tone: "income" },
          { label: "Missed/short periods", text: String(missed) },
          { label: "Balance", pence: balance, tone: "auto", emphasis: true },
        ],
        tables: [
          {
            columns: [
              { key: "due", label: "Due date", type: "date" },
              { key: "charge", label: "Charge", type: "currency" },
              { key: "paid", label: "Received", type: "currency" },
              { key: "shortfall", label: "Shortfall", type: "currency" },
              { key: "balance", label: "Balance", type: "currency" },
              { key: "status", label: "Status" },
            ],
            rows,
            totals: { due: null, charge: charged, paid: received, shortfall: charged - received > 0 ? charged - received : undefined, balance, status: null },
          },
        ],
      });
    } else {
      // No rent schedule — show rent payments received as a simple ledger.
      const payments = (paymentsByTenancy.get(ten.id) ?? []).sort(
        (a, b) => a.date.getTime() - b.date.getTime(),
      );
      if (payments.length === 0) continue; // nothing to show for this tenancy
      let running = 0;
      const rows: ReportRow[] = payments.map((p) => {
        running += p.amountPence;
        return { date: p.date, description: p.description, paid: p.amountPence, running };
      });
      const received = payments.reduce((s, p) => s + p.amountPence, 0);
      grandReceived += received;
      tenantSections.push({
        title: heading,
        description: "No rent schedule for this tenancy — showing rent received.",
        summary: [
          { label: "Rent received", pence: received, tone: "income", emphasis: true },
          { label: "Payments", text: String(payments.length) },
        ],
        tables: [
          {
            columns: [
              { key: "date", label: "Date", type: "date" },
              { key: "description", label: "Description" },
              { key: "paid", label: "Received", type: "currency" },
              { key: "running", label: "Cumulative", type: "currency" },
            ],
            rows,
            totals: { date: null, description: "Total", paid: received, running },
          },
        ],
      });
    }
  }

  const overview: ReportSection = {
    title: "Summary",
    summary: [
      { label: "Tenancies", text: String(tenantSections.length) },
      { label: "Rent charged", pence: grandCharged },
      { label: "Rent received", pence: grandReceived, tone: "income" },
      { label: "Missed/short periods", text: String(grandMissed) },
    ],
    emptyText: "No tenant activity for this period and portfolio.",
  };

  return {
    slug: "tenant-ledger",
    title: "Tenant Ledger",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name }),
    sections: tenantSections.length ? [overview, ...tenantSections] : [overview],
    disclaimer:
      "Charges are scheduled rent due; receipts are rent recorded against the schedule. A negative balance indicates arrears.",
  };
}
