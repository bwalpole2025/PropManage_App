import { getActiveContext } from "@/lib/auth/active-org";
import { parseReportFilters } from "@/lib/reports/filters";
import { REPORTS_BY_SLUG } from "@/lib/reports/registry";
import { reportFilename, reportToCsv } from "@/lib/reports/csv";
import { reportToPdf } from "@/lib/reports/pdf";
import { buildReport } from "@/services/reports";

/** Export a report as CSV (?format=csv, default) or PDF (?format=pdf). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report: slug } = await params;
  const meta = REPORTS_BY_SLUG[slug];
  if (!meta || meta.href) {
    return new Response("Unknown report", { status: 404 });
  }

  const { entityId } = await getActiveContext();
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filters = parseReportFilters(sp);

  const doc = await buildReport(slug, entityId, filters);
  if (!doc) return new Response("Unknown report", { status: 404 });

  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "csv";

  if (format === "pdf") {
    const bytes = reportToPdf(doc);
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${reportFilename(doc, "pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const csv = reportToCsv(doc);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportFilename(doc, "csv")}"`,
      "Cache-Control": "no-store",
    },
  });
}
