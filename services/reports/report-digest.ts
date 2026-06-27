// Builds the monthly portfolio report digest emailed to the account holder.
// Reuses the existing dashboard + compliance services so the figures match what
// the landlord sees in-app. Pure aggregation — the email/job layer handles
// delivery (via the Resend-backed dispatch pipeline).

import { getDashboardData } from "@/services/dashboard";
import { getComplianceOverview } from "@/services/compliance";
import { formatPence } from "@/lib/format";

export interface ReportDigest {
  /** e.g. "June 2026". */
  periodLabel: string;
  /** Label/value metric rows for the email table. */
  metrics: { label: string; value: string }[];
  /** Highlight bullets (compliance call-outs). */
  notes: string[];
}

const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

export async function buildAccountReportDigest(
  accountId: string,
  now: Date = new Date(),
): Promise<ReportDigest> {
  const [dash, compliance] = await Promise.all([
    getDashboardData(accountId),
    // Compliance is best-effort — a report should still send if it errors.
    getComplianceOverview(accountId, now).catch(() => null),
  ]);

  const k = dash.kpis;
  const metrics = [
    { label: `Income (tax year ${dash.taxYear})`, value: formatPence(k.incomePence) },
    { label: "Expenses", value: formatPence(k.expensesPence) },
    { label: "Net profit", value: formatPence(k.netPence) },
    { label: "Arrears outstanding", value: formatPence(k.arrearsPence) },
    { label: "Estimated tax", value: formatPence(dash.tax.estimatedTaxPence) },
  ];

  const notes: string[] = [];
  if (compliance) {
    if (compliance.counts.red > 0) {
      notes.push(
        `${compliance.counts.red} compliance item${compliance.counts.red === 1 ? "" : "s"} need urgent action.`,
      );
    }
    if (compliance.counts.amber > 0) {
      notes.push(
        `${compliance.counts.amber} compliance item${compliance.counts.amber === 1 ? "" : "s"} due soon.`,
      );
    }
    if (compliance.counts.red === 0 && compliance.counts.amber === 0) {
      notes.push("All compliance items are up to date.");
    }
  }

  return { periodLabel: monthYear.format(now), metrics, notes };
}
