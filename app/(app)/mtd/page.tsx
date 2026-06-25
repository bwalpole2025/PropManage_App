import { FileCheck2, CheckCircle2, Clock } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getMtdOverview } from "@/services/mtd";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { ComingSoon } from "@/components/shared/coming-soon";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate, relativeDays } from "@/lib/format";

export default async function MtdPage() {
  const ctx = await getActiveContext();
  const mtd = await getMtdOverview(ctx.entityId);

  return (
    <div className="space-y-6">
      <SectionCoachmark section="mtd" />
      <PageHeader
        title="Making Tax Digital"
        description={`Quarterly updates for Income Tax · tax year ${mtd.taxYear}`}
        actions={
          mtd.connected ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> HMRC connected ({mtd.mode})
            </Badge>
          ) : (
            <Button variant="outline" disabled>
              Connect to HMRC (soon)
            </Button>
          )
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" /> Quarterly obligations
          </CardTitle>
          <CardDescription>
            Periods HMRC expects a digital update for. Keep your records here and
            submit each quarter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l border-border pl-6">
            {mtd.obligations.map((o) => (
              <li key={o.periodKey} className="relative">
                <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {o.type === "FINAL_DECLARATION"
                        ? "Final declaration"
                        : `Quarterly update`}{" "}
                      <span className="text-muted-foreground">
                        ({o.periodKey})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.startDate)} – {formatDate(o.endDate)} · due{" "}
                      {formatDate(o.dueDate)} ({relativeDays(o.dueDate)})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={o.status === "FULFILLED" ? "success" : "warning"}>
                      {o.status}
                    </Badge>
                    <Button size="sm" variant="outline" disabled>
                      Submit (soon)
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <ComingSoon
        title="Live HMRC submission"
        description="Submitting quarterly updates and the final declaration is wired behind the HmrcMtdService interface (currently mocked). Connecting a real HMRC sandbox is the next step."
      >
        <DisclaimerBanner text="MTD figures are derived from your categorised records and are not tax advice." />
      </ComingSoon>
    </div>
  );
}
