import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { recentTaxYears } from "@/lib/format";
import { parseReportFilters } from "@/lib/reports/filters";
import { REPORTS_BY_SLUG } from "@/lib/reports/registry";
import { buildReport } from "@/services/reports";
import { getCompanies, getPortfolios } from "@/services/reports/data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ReportControls } from "@/components/reports/report-controls";
import { ReportView } from "@/components/reports/report-view";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ report: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { report: slug } = await params;
  const meta = REPORTS_BY_SLUG[slug];
  if (!meta) notFound();
  // Reports with a bespoke route (e.g. the Tax Statement) don't render here.
  if (meta.href) redirect(meta.href);

  const sp = await searchParams;
  const ctx = await getActiveContext();
  const filters = parseReportFilters(sp);

  const [portfolios, companies] = await Promise.all([
    getPortfolios(ctx.entityId),
    meta.filters.company ? getCompanies(ctx.entityId) : Promise.resolve([]),
  ]);

  const doc = await buildReport(slug, ctx.entityId, filters);
  if (!doc) notFound();

  // Export links carry the active filters through.
  const exportQuery = new URLSearchParams();
  for (const key of ["period", "from", "to", "portfolioId", "ty", "companyId", "direction", "category"]) {
    const v = sp[key];
    if (v) exportQuery.set(key, v);
  }
  const exportHref = (format: "csv" | "pdf") => {
    const q = new URLSearchParams(exportQuery);
    q.set("format", format);
    return `/reports/${slug}/export?${q.toString()}`;
  };

  return (
    <div className="space-y-6">
      <Link
        href="/reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All reports
      </Link>

      <PageHeader
        title={doc.title}
        description={meta.description}
        actions={
          <>
            <a href={exportHref("pdf")} target="_blank" rel="noopener">
              <Button variant="outline">
                <FileText className="h-4 w-4" /> PDF
              </Button>
            </a>
            <a href={exportHref("csv")}>
              <Button variant="outline">
                <Download className="h-4 w-4" /> CSV
              </Button>
            </a>
          </>
        }
      />

      <ReportControls
        slug={slug}
        config={meta.filters}
        portfolios={portfolios.map((p) => ({ id: p.id, name: p.name }))}
        companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        taxYears={recentTaxYears(5)}
      />

      {doc.meta?.length ? (
        <p className="text-xs text-muted-foreground">
          {[doc.subtitle, ...doc.meta].filter(Boolean).join("  ·  ")}
        </p>
      ) : null}

      <ReportView doc={doc} />
    </div>
  );
}
