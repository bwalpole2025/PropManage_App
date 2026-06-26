// Transaction-driven reports: General Ledger, Income Statement (P&L),
// Net Cashflow, Monthly Cashflow Statement and Tracked Transactions. Each fetches
// scoped transactions, aggregates with the pure helpers and returns a uniform
// ReportDocument.

import { TxnDirection } from "@/lib/enums";
import { categoryLabel, categoryTreatment, isKnownCategory } from "@/lib/categories";
import type { ReportFilters } from "@/lib/reports/filters";
import type { ReportColumn, ReportDocument, ReportRow } from "@/lib/reports/types";
import {
  bucketByMonth,
  groupByCategory,
  sumIn,
  sumOut,
} from "@/lib/reports/aggregate";
import {
  getReportEntity,
  getScopedTransactions,
  resolvePortfolioScope,
  type ScopedTxn,
} from "./data";
import { standardMeta, standardSubtitle } from "./_shared";

const propertyCell = (t: ScopedTxn) => t.propertyLabel ?? "—";
const dirLabel = (d: string) => (d === TxnDirection.INCOME ? "Income" : "Expense");
const moneyIn = (t: ScopedTxn) => (t.direction === TxnDirection.INCOME ? t.amountPence : undefined);
const moneyOut = (t: ScopedTxn) => (t.direction === TxnDirection.EXPENSE ? t.amountPence : undefined);

const CATEGORY_TABLE_COLUMNS: ReportColumn[] = [
  { key: "category", label: "Category" },
  { key: "count", label: "Txns", type: "number" },
  { key: "amount", label: "Amount", type: "currency" },
];

function categoryRows(txns: { amountPence: number; category: string | null }[]): {
  rows: ReportRow[];
  total: number;
} {
  const groups = groupByCategory(txns);
  const rows = groups.map((g) => ({ category: g.label, count: g.count, amount: g.amountPence }));
  const total = groups.reduce((s, g) => s + g.amountPence, 0);
  return { rows, total };
}

async function fetchScope(entityId: string, filters: ReportFilters, extra?: {
  direction?: string;
  category?: string;
}) {
  const [entity, scope] = await Promise.all([
    getReportEntity(entityId),
    resolvePortfolioScope(entityId, filters.portfolioId),
  ]);
  const txns = await getScopedTransactions(entityId, {
    filters,
    scope,
    direction: extra?.direction,
    category: extra?.category,
  });
  return { entity, scope, txns };
}

// ---------------------------------------------------------------------------
// General Ledger — every transaction line with a running balance.
// ---------------------------------------------------------------------------

export async function buildGeneralLedger(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const { entity, scope, txns } = await fetchScope(entityId, filters);

  let balance = 0;
  const rows: ReportRow[] = txns.map((t) => {
    balance += (moneyIn(t) ?? 0) - (moneyOut(t) ?? 0);
    return {
      date: t.date,
      property: propertyCell(t),
      description: t.description,
      category: t.category ? categoryLabel(t.category) : "Uncategorised",
      in: moneyIn(t),
      out: moneyOut(t),
      balance,
    };
  });

  const totalIn = sumIn(txns);
  const totalOut = sumOut(txns);

  return {
    slug: "general-ledger",
    title: "General Ledger",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Total income", pence: totalIn, tone: "income" },
          { label: "Total expenses", pence: totalOut, tone: "expense" },
          { label: "Net movement", pence: totalIn - totalOut, emphasis: true, tone: "auto" },
          { label: "Transactions", text: String(txns.length) },
        ],
      },
      {
        title: "Ledger",
        tables: [
          {
            columns: [
              { key: "date", label: "Date", type: "date" },
              { key: "property", label: "Property" },
              { key: "description", label: "Description" },
              { key: "category", label: "Category" },
              { key: "in", label: "Money in", type: "currency" },
              { key: "out", label: "Money out", type: "currency" },
              { key: "balance", label: "Balance", type: "currency" },
            ],
            rows,
            totals: {
              date: null,
              property: null,
              description: "Totals",
              category: null,
              in: totalIn,
              out: totalOut,
              balance: totalIn - totalOut,
            },
            emptyText: "No transactions for this period and portfolio.",
          },
        ],
      },
    ],
    disclaimer:
      "Generated from your recorded transactions. The running balance reflects money in less money out across the selected period only.",
  };
}

// ---------------------------------------------------------------------------
// Income Statement (P&L) — operating income & expenses, before debt service
// (mortgage interest) and capital expenditure.
// ---------------------------------------------------------------------------

function isOperatingIncome(t: ScopedTxn): boolean {
  if (t.direction !== TxnDirection.INCOME) return false;
  if (!isKnownCategory(t.category)) return true; // uncategorised income is operating
  return categoryTreatment(t.category) === "INCOME";
}
function isOperatingExpense(t: ScopedTxn): boolean {
  if (t.direction !== TxnDirection.EXPENSE) return false;
  if (!isKnownCategory(t.category)) return true; // uncategorised expense is operating
  return categoryTreatment(t.category) === "ALLOWABLE";
}

export async function buildIncomeStatement(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const { entity, scope, txns } = await fetchScope(entityId, filters);

  const incomeTxns = txns.filter(isOperatingIncome);
  const expenseTxns = txns.filter(isOperatingExpense);
  const income = categoryRows(incomeTxns);
  const expense = categoryRows(expenseTxns);
  const netProfit = income.total - expense.total;

  return {
    slug: "income-statement",
    title: "Income Statement (P&L)",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Operating income", pence: income.total, tone: "income" },
          { label: "Operating expenses", pence: expense.total, tone: "expense" },
          { label: "Net operating profit", pence: netProfit, emphasis: true, tone: "auto" },
        ],
      },
      {
        title: "Income",
        tables: [
          {
            columns: CATEGORY_TABLE_COLUMNS,
            rows: income.rows,
            totals: { category: "Total income", count: incomeTxns.length, amount: income.total },
            emptyText: "No operating income in this period.",
          },
        ],
      },
      {
        title: "Operating expenses",
        tables: [
          {
            columns: CATEGORY_TABLE_COLUMNS,
            rows: expense.rows,
            totals: { category: "Total expenses", count: expenseTxns.length, amount: expense.total },
            emptyText: "No operating expenses in this period.",
            note: "Excludes debt service (mortgage interest) and capital expenditure, which are not operating costs.",
          },
        ],
      },
    ],
    disclaimer:
      "Operating profit before debt service and capital. This is not a tax computation — see the Hammock Tax Statement for SA105 figures.",
  };
}

// ---------------------------------------------------------------------------
// Net Cashflow — income and expenses by category, net of everything (includes
// debt service, capital and non-taxable items).
// ---------------------------------------------------------------------------

export async function buildNetCashflow(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const { entity, scope, txns } = await fetchScope(entityId, filters);

  const incomeTxns = txns.filter((t) => t.direction === TxnDirection.INCOME);
  const expenseTxns = txns.filter((t) => t.direction === TxnDirection.EXPENSE);
  const income = categoryRows(incomeTxns);
  const expense = categoryRows(expenseTxns);
  const net = income.total - expense.total;

  return {
    slug: "net-cashflow",
    title: "Net Cashflow",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Total money in", pence: income.total, tone: "income" },
          { label: "Total money out", pence: expense.total, tone: "expense" },
          { label: "Net cashflow", pence: net, emphasis: true, tone: "auto" },
        ],
      },
      {
        title: "Money in by category",
        tables: [
          {
            columns: CATEGORY_TABLE_COLUMNS,
            rows: income.rows,
            totals: { category: "Total in", count: incomeTxns.length, amount: income.total },
            emptyText: "No income in this period.",
          },
        ],
      },
      {
        title: "Money out by category",
        tables: [
          {
            columns: CATEGORY_TABLE_COLUMNS,
            rows: expense.rows,
            totals: { category: "Total out", count: expenseTxns.length, amount: expense.total },
            emptyText: "No expenses in this period.",
          },
        ],
      },
    ],
    disclaimer:
      "Net cashflow across all categories, including debt service, capital items and transfers. Not a profit or tax figure.",
  };
}

// ---------------------------------------------------------------------------
// Monthly Cashflow Statement — all payments in/out per calendar month.
// ---------------------------------------------------------------------------

export async function buildMonthlyCashflow(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const { entity, scope, txns } = await fetchScope(entityId, filters);

  const buckets = bucketByMonth(txns, (t) => t.date);
  let running = 0;
  const rows: ReportRow[] = buckets.map((b) => {
    const inP = sumIn(b.items);
    const outP = sumOut(b.items);
    running += inP - outP;
    return { month: b.label, in: inP, out: outP, net: inP - outP, running };
  });

  const totalIn = sumIn(txns);
  const totalOut = sumOut(txns);

  return {
    slug: "monthly-cashflow",
    title: "Monthly Cashflow Statement",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Payments received", pence: totalIn, tone: "income" },
          { label: "Payments made", pence: totalOut, tone: "expense" },
          { label: "Net cashflow", pence: totalIn - totalOut, emphasis: true, tone: "auto" },
          { label: "Months with activity", text: String(buckets.length) },
        ],
      },
      {
        title: "By calendar month",
        tables: [
          {
            columns: [
              { key: "month", label: "Month" },
              { key: "in", label: "Payments in", type: "currency" },
              { key: "out", label: "Payments out", type: "currency" },
              { key: "net", label: "Net", type: "currency" },
              { key: "running", label: "Running net", type: "currency" },
            ],
            rows,
            totals: {
              month: "Total",
              in: totalIn,
              out: totalOut,
              net: totalIn - totalOut,
              running: totalIn - totalOut,
            },
            emptyText: "No payments in this period.",
            note: "Includes every payment in and out — personal items and transfers as well as property income and expenses.",
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tracked Transactions — the full transaction register with filters.
// ---------------------------------------------------------------------------

export async function buildTrackedTransactions(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const { entity, scope, txns } = await fetchScope(entityId, filters, {
    direction: filters.direction,
    category: filters.category,
  });

  const rows: ReportRow[] = txns.map((t) => ({
    date: t.date,
    property: propertyCell(t),
    description: t.description,
    category: t.category ? categoryLabel(t.category) : "Uncategorised",
    type: dirLabel(t.direction),
    amount: t.amountPence,
  }));

  const totalIn = sumIn(txns);
  const totalOut = sumOut(txns);

  const activeFilters: string[] = [];
  if (filters.direction) activeFilters.push(`Direction: ${dirLabel(filters.direction)}`);
  if (filters.category) activeFilters.push(`Category: ${categoryLabel(filters.category)}`);

  return {
    slug: "tracked-transactions",
    title: "Tracked Transactions",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, { portfolioName: scope.name, extra: activeFilters }),
    sections: [
      {
        title: "Summary",
        summary: [
          { label: "Transactions", text: String(txns.length) },
          { label: "Total income", pence: totalIn, tone: "income" },
          { label: "Total expenses", pence: totalOut, tone: "expense" },
          { label: "Net", pence: totalIn - totalOut, emphasis: true, tone: "auto" },
        ],
      },
      {
        title: "Transactions",
        tables: [
          {
            columns: [
              { key: "date", label: "Date", type: "date" },
              { key: "property", label: "Property" },
              { key: "description", label: "Description" },
              { key: "category", label: "Category" },
              { key: "type", label: "Type" },
              { key: "amount", label: "Amount", type: "currency" },
            ],
            rows,
            emptyText: "No tracked transactions match these filters.",
          },
        ],
      },
    ],
  };
}
