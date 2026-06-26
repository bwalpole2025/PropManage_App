import { LandlordType, LandlordTypeLabel } from "@/lib/enums";
import { Sa105Box, Sa105BoxLabel } from "@/lib/sa105";
import { getTaxYearConfig, type TaxBand } from "@/lib/tax-config";
import { formatDate, taxYearLabelFor } from "@/lib/format";
import { toCsv } from "@/lib/csv";
import type { ReportDocument } from "@/lib/reports/types";
import { getTaxEstimate } from "./tax";
import { getOwnerTaxEstimates } from "./owner-tax";

export interface ReportLine {
  box: string;
  label: string;
  amountPence: number;
}

export interface ReportOwner {
  id: string;
  legalName: string;
  ownedPropertyCount: number;
  totalIncomePence: number;
  totalAllowableExpensesPence: number;
  taxableProfitPence: number;
  estimatedTaxPence: number;
}

export interface TaxStatementReport {
  taxYear: string;
  entityName: string;
  landlordTypeLabel: string;
  txnCount: number;
  // SA105 structure: income lines then expenses by category.
  incomeLines: ReportLine[];
  expenseLines: ReportLine[];
  totalIncomePence: number;
  totalAllowableExpensesPence: number;
  taxableProfitPence: number;
  financeCostsPence: number;
  financeCostTaxReductionPence: number;
  propertyAllowanceUsedPence: number;
  estimatedTaxPence: number;
  owners: ReportOwner[];
  // The versioned tax-year parameters used (for transparency / audit).
  config: {
    propertyAllowancePence: number;
    financeCostReliefRate: number;
    appliedRate: number;
    appliedRateLabel: string;
    corporationTaxRate: number;
    personalAllowancePence: number;
    higherRateThresholdPence: number;
    additionalRateThresholdPence: number;
  };
  disclaimer: string;
}

const INCOME_BOXES: Sa105Box[] = [
  Sa105Box.RENTS_RECEIVED,
  Sa105Box.PREMIUMS_LEASES,
  Sa105Box.OTHER_PROPERTY_INCOME,
];

// Allowable-expense boxes that sum to totalAllowableExpensesPence. Residential
// finance costs (box44 — a basic-rate tax *reducer*, not a deduction) and the
// property income allowance (box20.1) are reported separately in the summary,
// never as expense lines. Loan/financial costs (box26) are an allowable expense
// only for limited companies; individuals get the box44 reducer instead.
const ALLOWABLE_EXPENSE_BOXES: Sa105Box[] = [
  Sa105Box.RENT_RATES_INSURANCE,
  Sa105Box.PROPERTY_REPAIRS,
  Sa105Box.LEGAL_PROFESSIONAL,
  Sa105Box.COSTS_SERVICES,
  Sa105Box.OTHER_EXPENSES,
];

/**
 * Pure: split a box breakdown into SA105 income/expense lines. The expense
 * lines reconcile to the allowable-expenses total (finance reducer + allowance
 * are excluded), and finance costs appear as an expense only for companies.
 */
export function reportLinesFromBreakdown(
  boxBreakdown: Record<string, number>,
  isCompany: boolean,
): { incomeLines: ReportLine[]; expenseLines: ReportLine[] } {
  const line = (b: Sa105Box): ReportLine => ({
    box: b,
    label: Sa105BoxLabel[b],
    amountPence: boxBreakdown[b] ?? 0,
  });
  const expenseBoxes = isCompany
    ? [...ALLOWABLE_EXPENSE_BOXES, Sa105Box.FINANCE_COSTS]
    : ALLOWABLE_EXPENSE_BOXES;
  return {
    incomeLines: INCOME_BOXES.map(line).filter((l) => l.amountPence !== 0),
    expenseLines: expenseBoxes.map(line).filter((l) => l.amountPence !== 0),
  };
}

/**
 * The Hammock Tax Statement report — the SA105-aligned view of the tax
 * estimation engine for a tax year: income lines, expenses by category, the
 * summary, per-owner pro-rata figures, and the versioned tax-year parameters.
 * Scoped by accountId (via the underlying services).
 */
export async function getTaxStatementReport(
  entityId: string,
  taxYearLabel: string | undefined,
  opts: { usePropertyAllowance?: boolean; taxBand?: TaxBand } = {},
): Promise<TaxStatementReport> {
  // Guard against a malformed tax-year label — downstream date math (taxYearStart)
  // would otherwise produce an Invalid Date and throw at the Prisma query.
  const taxYear =
    taxYearLabel && /^\d{4}-\d{2}$/.test(taxYearLabel)
      ? taxYearLabel
      : taxYearLabelFor();
  const { estimate, entity, txnCount } = await getTaxEstimate(entityId, taxYear, opts);
  const ownerTax = await getOwnerTaxEstimates(entityId, taxYear, opts);
  const cfg = getTaxYearConfig(taxYear);

  const isCompany = entity.type === LandlordType.LIMITED_COMPANY;
  const { incomeLines, expenseLines } = reportLinesFromBreakdown(
    estimate.boxBreakdown,
    isCompany,
  );

  const appliedRate = isCompany
    ? cfg.corporationTaxRate
    : cfg.incomeTaxBandRates[estimate.taxBand];
  const appliedRateLabel = isCompany
    ? "Corporation tax"
    : `${estimate.taxBand} rate`;

  const owners: ReportOwner[] = ownerTax.owners
    .filter((o) => o.ownedPropertyCount > 0)
    .map((o) => ({
      id: o.owner.id,
      legalName: o.owner.legalName,
      ownedPropertyCount: o.ownedPropertyCount,
      totalIncomePence: o.estimate.totalIncomePence,
      totalAllowableExpensesPence: o.estimate.totalAllowableExpensesPence,
      taxableProfitPence: o.estimate.taxableProfitPence,
      estimatedTaxPence: o.estimate.estimatedTaxPence,
    }));

  return {
    taxYear,
    entityName: entity.displayName,
    landlordTypeLabel:
      LandlordTypeLabel[entity.type as keyof typeof LandlordTypeLabel] ??
      entity.type,
    txnCount,
    incomeLines,
    expenseLines,
    totalIncomePence: estimate.totalIncomePence,
    totalAllowableExpensesPence: estimate.totalAllowableExpensesPence,
    taxableProfitPence: estimate.taxableProfitPence,
    financeCostsPence: estimate.financeCostsPence,
    financeCostTaxReductionPence: estimate.financeCostTaxReductionPence,
    propertyAllowanceUsedPence: estimate.propertyAllowanceUsedPence,
    estimatedTaxPence: estimate.estimatedTaxPence,
    owners,
    config: {
      propertyAllowancePence: cfg.propertyAllowancePence,
      financeCostReliefRate: cfg.financeCostReliefRate,
      appliedRate,
      appliedRateLabel,
      corporationTaxRate: cfg.corporationTaxRate,
      personalAllowancePence: cfg.personalAllowancePence,
      higherRateThresholdPence: cfg.higherRateThresholdPence,
      additionalRateThresholdPence: cfg.additionalRateThresholdPence,
    },
    disclaimer: estimate.disclaimer,
  };
}

const gbp = (pence: number) => (pence / 100).toFixed(2);

// Neutralise spreadsheet formula injection: a cell beginning with = + - @ (or a
// control char) is interpreted as a formula by Excel/Sheets. Owner names and the
// entity name are user-controlled and this CSV is shared with advisors, so prefix
// such cells with an apostrophe. (toCsv already RFC-4180 quote-escapes.)
function safe(v: string | number): string | number {
  return typeof v === "string" && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

/** The report as CSV (income, expenses, summary, per-owner) for export. */
export function taxStatementReportToCsv(report: TaxStatementReport): string {
  const rows: (string | number)[][] = [];
  const row = (...cells: (string | number)[]) => rows.push(cells.map(safe));

  row("Tax Statement (SA105)", report.entityName);
  row("Tax year", report.taxYear);
  row("Landlord type", report.landlordTypeLabel);
  row();
  row("Section", "SA105 box", "Description", "Amount (GBP)");
  for (const l of report.incomeLines) row("Income", l.box, l.label, gbp(l.amountPence));
  for (const l of report.expenseLines) row("Expense", l.box, l.label, gbp(l.amountPence));
  row();
  row("Total income", "", "", gbp(report.totalIncomePence));
  row("Allowable expenses", "", "", gbp(report.totalAllowableExpensesPence));
  if (report.propertyAllowanceUsedPence > 0) {
    row("Property allowance", "", "", gbp(report.propertyAllowanceUsedPence));
  }
  row("Taxable profit", "", "", gbp(report.taxableProfitPence));
  row("Finance costs", "", "", gbp(report.financeCostsPence));
  row("Finance-cost tax reduction", "", "", gbp(report.financeCostTaxReductionPence));
  row("Estimated tax", "", "", gbp(report.estimatedTaxPence));

  if (report.owners.length > 0) {
    row();
    row("Owner", "Properties", "Taxable income", "Allowable expenses", "Taxable profit", "Estimated tax");
    for (const o of report.owners) {
      row(
        o.legalName,
        o.ownedPropertyCount,
        gbp(o.totalIncomePence),
        gbp(o.totalAllowableExpensesPence),
        gbp(o.taxableProfitPence),
        gbp(o.estimatedTaxPence),
      );
    }
  }

  row();
  row(report.disclaimer);
  return toCsv(rows);
}

/**
 * The tax statement as a generic ReportDocument so it can share the report PDF
 * renderer (lib/reports/pdf). Mirrors the on-screen SA105 layout: income lines,
 * expense lines, the tax-forecast summary and per-owner figures.
 */
export function taxStatementReportToDocument(report: TaxStatementReport): ReportDocument {
  const sa105Cols = [
    { key: "box", label: "Box" },
    { key: "label", label: "Description" },
    { key: "amount", label: "Amount", type: "currency" as const },
  ];

  const summary: ReportDocument["sections"][number]["summary"] = [
    { label: "Total income", pence: report.totalIncomePence, tone: "income" },
    { label: "Allowable expenses", pence: report.totalAllowableExpensesPence, tone: "expense" },
  ];
  if (report.propertyAllowanceUsedPence > 0) {
    summary.push({ label: "Property allowance", pence: report.propertyAllowanceUsedPence });
  }
  summary.push({ label: "Taxable profit", pence: report.taxableProfitPence, tone: "auto" });
  if (report.financeCostsPence > 0) {
    summary.push({ label: "Finance costs", pence: report.financeCostsPence });
  }
  if (report.financeCostTaxReductionPence > 0) {
    summary.push({ label: "Finance-cost tax reduction", pence: report.financeCostTaxReductionPence });
  }
  summary.push({ label: "Estimated tax", pence: report.estimatedTaxPence, emphasis: true });

  return {
    slug: "tax-statement",
    title: "Hammock Tax Statement (SA105)",
    subtitle: `${report.entityName} · ${report.landlordTypeLabel}`,
    meta: [`Tax year: ${report.taxYear}`, `Generated: ${formatDate(new Date())}`],
    sections: [
      {
        title: "Income",
        tables: [
          {
            columns: sa105Cols,
            rows: report.incomeLines.map((l) => ({ box: l.box, label: l.label, amount: l.amountPence })),
            totals: { box: "", label: "Total income", amount: report.totalIncomePence },
            emptyText: "No income categorised in this tax year.",
          },
        ],
      },
      {
        title: "Expenses",
        tables: [
          {
            columns: sa105Cols,
            rows: report.expenseLines.map((l) => ({ box: l.box, label: l.label, amount: l.amountPence })),
            totals: { box: "", label: "Allowable expenses", amount: report.totalAllowableExpensesPence },
            emptyText: "No expenses categorised in this tax year.",
          },
        ],
      },
      { title: "Tax forecast", summary },
      {
        title: "Per-owner figures",
        tables: [
          {
            columns: [
              { key: "owner", label: "Owner" },
              { key: "properties", label: "Properties", type: "number" as const },
              { key: "income", label: "Taxable income", type: "currency" as const },
              { key: "expenses", label: "Allowable expenses", type: "currency" as const },
              { key: "profit", label: "Taxable profit", type: "currency" as const },
              { key: "tax", label: "Est. tax", type: "currency" as const },
            ],
            rows: report.owners.map((o) => ({
              owner: o.legalName,
              properties: o.ownedPropertyCount,
              income: o.totalIncomePence,
              expenses: o.totalAllowableExpensesPence,
              profit: o.taxableProfitPence,
              tax: o.estimatedTaxPence,
            })),
            emptyText: "No beneficial owners with property shares yet.",
          },
        ],
      },
    ],
    disclaimer: report.disclaimer,
  };
}
