import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { Card, CardContent } from "@/components/ui/card";
import { REPORT_GROUPS, REPORTS, type ReportGroup } from "@/lib/reports/registry";

export default function ReportsPage() {
  const grouped = REPORT_GROUPS.map((group) => ({
    group,
    reports: REPORTS.filter((r) => r.group === group),
  })).filter((g) => g.reports.length > 0);

  return (
    <div className="space-y-8">
      <SectionCoachmark section="reports" />
      <PageHeader
        title="Reports"
        description="Export-ready statements for you and your accountant — each viewable on screen and downloadable as PDF or CSV."
      />

      {grouped.map(({ group, reports }) => (
        <section key={group} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {GROUP_LABELS[group]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map((r) => {
              const Icon = r.icon;
              const href = r.href ?? `/reports/${r.slug}`;
              return (
                <Link key={r.slug} href={href} className="block">
                  <Card className="h-full transition-colors hover:border-primary/50">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold leading-tight">{r.title}</h3>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{r.short}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

const GROUP_LABELS: Record<ReportGroup, string> = {
  Financial: "Financial",
  Rental: "Rental",
  Transactions: "Transactions",
  Tax: "Tax",
};
