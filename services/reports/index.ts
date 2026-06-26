// Wires each dynamic report slug to its builder. The dynamic [report] page and
// the export route both go through buildReport(); the bespoke Tax Statement is
// not here (it has its own route/service).

import "server-only";
import type { ReportFilters } from "@/lib/reports/filters";
import type { ReportDocument } from "@/lib/reports/types";
import {
  buildGeneralLedger,
  buildIncomeStatement,
  buildMonthlyCashflow,
  buildNetCashflow,
  buildTrackedTransactions,
} from "./transaction-reports";
import { buildRentReceived, buildRentRoll, buildTenantLedger } from "./rental-reports";
import { buildAnnualReport, buildDirectorsLoans } from "./financial-reports";

type Builder = (entityId: string, filters: ReportFilters) => Promise<ReportDocument>;

export const REPORT_BUILDERS: Record<string, Builder> = {
  "annual-report": buildAnnualReport,
  "income-statement": buildIncomeStatement,
  "net-cashflow": buildNetCashflow,
  "monthly-cashflow": buildMonthlyCashflow,
  "general-ledger": buildGeneralLedger,
  "tracked-transactions": buildTrackedTransactions,
  "directors-loans": buildDirectorsLoans,
  "rent-received": buildRentReceived,
  "rent-roll": buildRentRoll,
  "tenant-ledger": buildTenantLedger,
};

/** Build a report by slug, or null if the slug has no dynamic builder. */
export async function buildReport(
  slug: string,
  entityId: string,
  filters: ReportFilters,
): Promise<ReportDocument | null> {
  const builder = REPORT_BUILDERS[slug];
  if (!builder) return null;
  return builder(entityId, filters);
}
