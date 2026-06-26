import Link from "next/link";
import { FileSpreadsheet, PieChart, Building2, FileText, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { ComingSoon } from "@/components/shared/coming-soon";
import { Card, CardContent } from "@/components/ui/card";

const PLANNED = [
  {
    icon: FileSpreadsheet,
    title: "Income & expense statement",
    description: "A full profit-and-loss for any date range, ready to export.",
  },
  {
    icon: PieChart,
    title: "Expense breakdown by SA105 box",
    description: "See where the money goes, grouped by tax category.",
  },
  {
    icon: Building2,
    title: "Per-property P&L",
    description: "Profitability and yield for each property in the portfolio.",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <SectionCoachmark section="reports" />
      <PageHeader
        title="Reports"
        description="Export-ready statements for you and your accountant."
      />

      <Link href="/reports/tax-statement" className="block">
        <Card className="transition-colors hover:border-primary/50">
          <CardContent className="flex items-center gap-4 p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Tax Statement (SA105)</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Your tax forecast aligned to SA105 — income, expenses, the
                finance-cost reducer and per-owner figures. Export to CSV.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <ComingSoon
        title="More reports are on the way"
        description="The data model already captures everything these reports need — they'll plug straight into the existing services."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {PLANNED.map((r) => {
            const Icon = r.icon;
            return (
              <Card key={r.title}>
                <CardContent className="p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{r.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ComingSoon>
    </div>
  );
}
