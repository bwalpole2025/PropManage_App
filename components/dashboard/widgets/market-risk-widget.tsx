import { ShieldAlert } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBpPercent } from "@/lib/finance";
import type { OverviewData } from "@/services/overview";

const LEVEL: Record<
  OverviewData["marketRisk"]["level"],
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  low: { label: "Low risk", tone: "success" },
  medium: { label: "Medium risk", tone: "warning" },
  high: { label: "High risk", tone: "danger" },
};

export function MarketRiskWidget({
  risk,
  className,
}: {
  risk: OverviewData["marketRisk"];
  className?: string;
}) {
  const level = LEVEL[risk.level];
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Market Risk</CardTitle>
          <CardDescription>From your portfolio signals</CardDescription>
        </div>
        <ShieldAlert className="h-5 w-5 text-warning-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge tone={level.tone}>{level.label}</Badge>
        <ul className="space-y-1.5 text-sm">
          <Factor label="Void rate" value={`${risk.voidRatePct}%`} />
          <Factor label="Arrears rate" value={`${risk.arrearsRatePct}%`} />
          <Factor label="Average LTV" value={formatBpPercent(risk.avgLtvBp)} />
        </ul>
      </CardContent>
    </WidgetCard>
  );
}

function Factor({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  );
}
