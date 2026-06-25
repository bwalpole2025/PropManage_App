import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { WidgetCard } from "../widget-card";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import { ComplianceTypeLabel } from "@/lib/enums";
import type { OverviewData } from "@/services/overview";

export function ComplianceWidget({
  compliance,
  className,
}: {
  compliance: OverviewData["compliance"];
  className?: string;
}) {
  return (
    <WidgetCard className={className}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>Compliance reminders</CardTitle>
          <CardDescription>Certificates due soon</CardDescription>
        </div>
        <ShieldCheck className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        {compliance.length === 0 ? (
          <EmptyState
            title="Nothing due"
            description="No certificates expiring in the next 45 days."
          />
        ) : (
          <ul className="space-y-3">
            {compliance.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {ComplianceTypeLabel[
                      c.type as keyof typeof ComplianceTypeLabel
                    ] ?? c.type}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.propertyLabel ?? "Portfolio-wide"}
                  </p>
                </div>
                <ReminderBadge date={c.expiryDate} />
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/files"
          className="mt-4 block text-sm font-medium text-primary hover:underline"
        >
          All files &amp; dates →
        </Link>
      </CardContent>
    </WidgetCard>
  );
}
