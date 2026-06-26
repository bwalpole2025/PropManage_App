import { getActiveContext } from "@/lib/auth/active-org";
import {
  getTaxStatementReport,
  taxStatementReportToCsv,
} from "@/services/tax-report";
import type { TaxBand } from "@/lib/tax";

const BANDS = new Set<TaxBand>(["BASIC", "HIGHER", "ADDITIONAL"]);

/** Download the SA105 tax statement report for a tax year as CSV. */
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
  const csv = taxStatementReportToCsv(report);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tax-statement-${report.taxYear.replace(/[^0-9-]/g, "")}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
