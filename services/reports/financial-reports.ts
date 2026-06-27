// Financial reports that don't fit the plain transaction-stream mould:
// the Annual Report (a year-end overview for a portfolio + tax year) and
// Directors' Loans (movements grouped by company and director).

import { prisma } from "@/lib/db";
import { TxnDirection } from "@/lib/enums";
import { ExtraCategory, categoryTreatment, isKnownCategory } from "@/lib/categories";
import { Sa105Category } from "@/lib/sa105";
import {
  formatDate,
  taxYearEndDate,
  taxYearLabelFor,
  taxYearStartDate,
} from "@/lib/format";
import type { ReportFilters } from "@/lib/reports/filters";
import type { ReportDocument, ReportRow, ReportSection } from "@/lib/reports/types";
import { sumIn, sumOut } from "@/lib/reports/aggregate";
import {
  getCompanies,
  getReportEntity,
  getScopedTransactions,
  resolvePortfolioScope,
  type ScopedTxn,
} from "./data";
import {
  CATEGORY_DRILLDOWN_NOTE,
  CATEGORY_TABLE_COLUMNS,
  categoryRowsWithDetail,
  standardMeta,
  standardSubtitle,
} from "./_shared";

// ---------------------------------------------------------------------------
// Annual Report — overview for a portfolio and tax year.
// ---------------------------------------------------------------------------

export async function buildAnnualReport(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const taxYear = filters.taxYear ?? taxYearLabelFor();
  const startYear = Number.parseInt(taxYear.slice(0, 4), 10);
  const from = taxYearStartDate(taxYear);
  const end = taxYearEndDate(taxYear);
  const to = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999));

  const [entity, scope] = await Promise.all([
    getReportEntity(entityId),
    resolvePortfolioScope(entityId, filters.portfolioId),
  ]);
  // Reuse the period-driven fetch by overriding the window to the tax year.
  const localFilters: ReportFilters = {
    ...filters,
    period: { preset: "custom", from, to, label: `${formatDate(from)} – ${formatDate(end)}` },
  };
  const txns = await getScopedTransactions(entityId, { filters: localFilters, scope });

  const incomeTxns = txns.filter((t) => t.direction === TxnDirection.INCOME);
  const expenseTxns = txns.filter((t) => t.direction === TxnDirection.EXPENSE);
  const totalIncome = sumIn(txns);
  const totalExpenses = sumOut(txns);

  const debtService = expenseTxns
    .filter((t) => t.category === Sa105Category.MORTGAGE_INTEREST)
    .reduce((s, t) => s + t.amountPence, 0);
  const capital = expenseTxns
    .filter((t) => t.category === ExtraCategory.CAPITAL_EXPENDITURE)
    .reduce((s, t) => s + t.amountPence, 0);
  const operatingExpenses = expenseTxns
    .filter((t) => (isKnownCategory(t.category) ? categoryTreatment(t.category) === "ALLOWABLE" : true))
    .reduce((s, t) => s + t.amountPence, 0);
  const operatingIncome = incomeTxns
    .filter((t) => (isKnownCategory(t.category) ? categoryTreatment(t.category) === "INCOME" : true))
    .reduce((s, t) => s + t.amountPence, 0);

  const incomeByCategory = categoryRowsWithDetail(incomeTxns);
  const expenseByCategory = categoryRowsWithDetail(expenseTxns);

  // Per-property performance.
  const perProp = new Map<string, { label: string; income: number; expense: number }>();
  for (const t of txns) {
    const key = t.propertyId ?? "__none__";
    const label = t.propertyLabel ?? "Unassigned";
    const row = perProp.get(key) ?? { label, income: 0, expense: 0 };
    if (t.direction === TxnDirection.INCOME) row.income += t.amountPence;
    else row.expense += t.amountPence;
    perProp.set(key, row);
  }
  const propRows: ReportRow[] = [...perProp.values()]
    .map((p) => ({ property: p.label, income: p.income, expense: p.expense, net: p.income - p.expense }))
    .sort((a, b) => (b.net as number) - (a.net as number));

  // Portfolio / tenancy snapshot for the year.
  const propertyWhere =
    scope.propertyIds === null
      ? { accountId: entityId }
      : { accountId: entityId, id: { in: scope.propertyIds } };
  const [propertyCount, activeTenancies] = await Promise.all([
    prisma.property.count({ where: propertyWhere }),
    prisma.tenancy.count({ where: { status: "ACTIVE", property: propertyWhere } }),
  ]);

  return {
    slug: "annual-report",
    title: "Annual Report",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, {
      periodLine: `Tax year: ${taxYear} (6 Apr ${startYear} – 5 Apr ${startYear + 1})`,
      portfolioName: scope.name,
    }),
    sections: [
      {
        title: "Financial overview",
        summary: [
          { label: "Total income", pence: totalIncome, tone: "income" },
          { label: "Total expenses", pence: totalExpenses, tone: "expense" },
          { label: "Net cashflow", pence: totalIncome - totalExpenses, tone: "auto", emphasis: true },
          { label: "Operating profit", pence: operatingIncome - operatingExpenses, tone: "auto" },
          { label: "Debt service (mortgage interest)", pence: debtService },
          { label: "Capital expenditure", pence: capital },
        ],
      },
      {
        title: "Portfolio",
        summary: [
          { label: "Properties", text: String(propertyCount) },
          { label: "Active tenancies", text: String(activeTenancies) },
          { label: "Transactions in year", text: String(txns.length) },
        ],
      },
      {
        title: "Income by category",
        tables: [
          {
            columns: CATEGORY_TABLE_COLUMNS,
            rows: incomeByCategory.rows,
            rowDetails: incomeByCategory.rowDetails,
            totals: { category: "Total income", count: incomeTxns.length, amount: totalIncome },
            emptyText: "No income recorded for this tax year.",
            note: CATEGORY_DRILLDOWN_NOTE,
          },
        ],
      },
      {
        title: "Expenses by category",
        tables: [
          {
            columns: CATEGORY_TABLE_COLUMNS,
            rows: expenseByCategory.rows,
            rowDetails: expenseByCategory.rowDetails,
            totals: { category: "Total expenses", count: expenseTxns.length, amount: totalExpenses },
            emptyText: "No expenses recorded for this tax year.",
            note: CATEGORY_DRILLDOWN_NOTE,
          },
        ],
      },
      {
        title: "Per-property performance",
        tables: [
          {
            columns: [
              { key: "property", label: "Property" },
              { key: "income", label: "Income", type: "currency" },
              { key: "expense", label: "Expenses", type: "currency" },
              { key: "net", label: "Net", type: "currency" },
            ],
            rows: propRows,
            totals: { property: "Total", income: totalIncome, expense: totalExpenses, net: totalIncome - totalExpenses },
            emptyText: "No property activity for this tax year.",
          },
        ],
      },
    ],
    disclaimer:
      "A year-end overview from your recorded transactions. For your Self Assessment figures, see the Tax Statement.",
  };
}

// ---------------------------------------------------------------------------
// Directors' Loans — movements by company and director.
// ---------------------------------------------------------------------------

interface DirectorAgg {
  director: string;
  introduced: number; // money in from director (INCOME)
  drawn: number; // money out to director (EXPENSE)
  movements: ScopedTxn[];
}

export async function buildDirectorsLoans(
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument> {
  const [entity, companies] = await Promise.all([
    getReportEntity(entityId),
    getCompanies(entityId),
  ]);

  // Property → company map (a property's portfolio may be backed by a company).
  const properties = await prisma.property.findMany({
    where: { accountId: entityId },
    select: { id: true, portfolio: { select: { companyId: true } } },
  });
  const propertyCompany = new Map<string, string | null>(
    properties.map((p) => [p.id, p.portfolio?.companyId ?? null]),
  );
  const companyName = new Map<string, string>(companies.map((c) => [c.id, c.name]));

  // All directors'-loan movements in the period (account-scoped, all portfolios).
  const txns = await getScopedTransactions(entityId, {
    filters,
    scope: { propertyIds: null, includeNullProperty: true, name: "All" },
    category: ExtraCategory.DIRECTORS_LOAN,
  });

  // Attribute each movement to a company.
  const resolveCompany = (t: ScopedTxn): string => {
    const viaProperty = t.propertyId ? propertyCompany.get(t.propertyId) ?? null : null;
    if (viaProperty) return viaProperty;
    if (companies.length === 1) return companies[0].id; // single-company account
    return "__unassigned__";
  };

  // company id → director name → aggregate
  const byCompany = new Map<string, Map<string, DirectorAgg>>();
  for (const t of txns) {
    const companyId = resolveCompany(t);
    if (filters.companyId && companyId !== filters.companyId) continue;
    const director = t.subcategory?.trim() || "Unattributed";
    const directors = byCompany.get(companyId) ?? new Map<string, DirectorAgg>();
    const agg = directors.get(director) ?? { director, introduced: 0, drawn: 0, movements: [] };
    if (t.direction === TxnDirection.INCOME) agg.introduced += t.amountPence;
    else agg.drawn += t.amountPence;
    agg.movements.push(t);
    directors.set(director, agg);
    byCompany.set(companyId, directors);
  }

  let grandIntroduced = 0;
  let grandDrawn = 0;
  const companySections: ReportSection[] = [];

  // Stable order: real companies first (by name), then unassigned.
  const companyIds = [...byCompany.keys()].sort((a, b) => {
    const an = companyName.get(a) ?? "Unassigned";
    const bn = companyName.get(b) ?? "Unassigned";
    return an.localeCompare(bn);
  });

  for (const companyId of companyIds) {
    const directors = byCompany.get(companyId)!;
    const name = companyName.get(companyId) ?? "Unassigned company";
    const dirList = [...directors.values()].sort((a, b) => a.director.localeCompare(b.director));

    const directorRows: ReportRow[] = dirList.map((d) => ({
      director: d.director,
      introduced: d.introduced,
      drawn: d.drawn,
      balance: d.introduced - d.drawn,
    }));
    const cIntroduced = dirList.reduce((s, d) => s + d.introduced, 0);
    const cDrawn = dirList.reduce((s, d) => s + d.drawn, 0);
    grandIntroduced += cIntroduced;
    grandDrawn += cDrawn;

    const movementRows: ReportRow[] = dirList
      .flatMap((d) => d.movements)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((t) => ({
        date: t.date,
        director: t.subcategory?.trim() || "Unattributed",
        description: t.description,
        in: t.direction === TxnDirection.INCOME ? t.amountPence : undefined,
        out: t.direction === TxnDirection.EXPENSE ? t.amountPence : undefined,
      }));

    companySections.push({
      title: name,
      summary: [
        { label: "Introduced by directors", pence: cIntroduced, tone: "income" },
        { label: "Drawn / repaid", pence: cDrawn, tone: "expense" },
        { label: "Balance owed to directors", pence: cIntroduced - cDrawn, tone: "auto", emphasis: true },
      ],
      tables: [
        {
          title: "By director",
          columns: [
            { key: "director", label: "Director" },
            { key: "introduced", label: "Introduced", type: "currency" },
            { key: "drawn", label: "Drawn/repaid", type: "currency" },
            { key: "balance", label: "Balance owed", type: "currency" },
          ],
          rows: directorRows,
          totals: { director: "Total", introduced: cIntroduced, drawn: cDrawn, balance: cIntroduced - cDrawn },
        },
        {
          title: "Movements",
          columns: [
            { key: "date", label: "Date", type: "date" },
            { key: "director", label: "Director" },
            { key: "description", label: "Description" },
            { key: "in", label: "In (introduced)", type: "currency" },
            { key: "out", label: "Out (drawn)", type: "currency" },
          ],
          rows: movementRows,
          totals: { date: null, director: null, description: "Total", in: cIntroduced, out: cDrawn },
        },
      ],
    });
  }

  const overview: ReportSection = {
    title: "Summary",
    summary: [
      { label: "Companies", text: String(companySections.length) },
      { label: "Introduced by directors", pence: grandIntroduced, tone: "income" },
      { label: "Drawn / repaid", pence: grandDrawn, tone: "expense" },
      { label: "Net owed to directors", pence: grandIntroduced - grandDrawn, tone: "auto", emphasis: true },
    ],
    emptyText:
      companies.length === 0
        ? "This account has no companies. Directors' loans apply to limited-company portfolios."
        : "No directors' loan movements recorded for this period.",
  };

  return {
    slug: "directors-loans",
    title: "Directors' Loans",
    subtitle: standardSubtitle(entity),
    meta: standardMeta(filters, {
      extra: companies.length === 0 ? ["No companies on this account"] : undefined,
    }),
    sections: companySections.length ? [overview, ...companySections] : [overview],
    disclaimer:
      "A positive balance is money the company owes the director. An overdrawn (negative) director's loan account can have tax consequences — discuss with your accountant.",
  };
}
