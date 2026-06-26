import { getActiveContext } from "@/lib/auth/active-org";
import {
  getTaxStatementReport,
  taxStatementReportToCsv,
  taxStatementReportToDocument,
} from "@/services/tax-report";
import { reportToPdf } from "@/lib/reports/pdf";
import type { TaxBand } from "@/lib/tax";

const BANDS = new Set<TaxBand>(["BASIC", "HIGHER", "ADDITIONAL"]);

/** Download the SA105 tax statement report for a tax year as CSV (default) or PDF. */
export async function GET(req: Request) {
  const { entityId } = await getActiveContext();
  const url = new URL(req.url);
  const ty = url.searchParams.get("ty") || undefined;
  const bandParam = url.searchParams.get("band");
  const band =
    bandParam && BANDS.has(bandParam as TaxBand)
      ? (bandParam as TaxBand)
      : undefined;

  const report = await getTaxStatementReport(entityId, ty, {
    taxBand: band,
    usePropertyAllowance: url.searchParams.get("allowance") === "1",
  });
  const stamp = report.taxYear.replace(/[^0-9-]/g, "");

  if (url.searchParams.get("format") === "pdf") {
    const bytes = reportToPdf(taxStatementReportToDocument(report));
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="tax-statement-${stamp}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = taxStatementReportToCsv(report);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-statement-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
