"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  CalendarClock,
  Clock,
  ChevronRight,
  Scale,
  ListChecks,
} from "lucide-react";
import {
  complianceRegulations,
  REGULATION_CATEGORIES,
  type ComplianceRegulation,
  type RegulationCategory,
  type RegulationDefaultStatus,
} from "@/lib/compliance/complianceData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tab = "All" | RegulationCategory;

const STATUS_META: Record<
  RegulationDefaultStatus,
  {
    label: string;
    tone: "success" | "danger" | "warning";
    summaryLabel: string;
    Icon: typeof ShieldCheck;
  }
> = {
  compliant: {
    label: "Compliant",
    tone: "success",
    summaryLabel: "Compliant",
    Icon: ShieldCheck,
  },
  action_required: {
    label: "Action required",
    tone: "danger",
    summaryLabel: "Action required",
    Icon: AlertTriangle,
  },
  upcoming_duty: {
    label: "Upcoming",
    tone: "warning",
    summaryLabel: "Upcoming duties",
    Icon: CalendarClock,
  },
};

/** Primary act name only — drops the trailing "(...)" and any secondary refs. */
function shortLegalRef(legalReference: string): string {
  return legalReference
    .split(";")[0]
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

/** Green badge / yellow badge / red pulsing dot, per the status. */
function StatusIndicator({ status }: { status: RegulationDefaultStatus }) {
  if (status === "action_required") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
        </span>
        Action required
      </span>
    );
  }
  const meta = STATUS_META[status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ComplianceDashboard({
  regulations = complianceRegulations,
}: {
  regulations?: ComplianceRegulation[];
}) {
  const [tab, setTab] = useState<Tab>("All");

  // Portfolio-wide status totals (across all regulations, not just the filter).
  const totals = useMemo(() => {
    const t = { compliant: 0, action_required: 0, upcoming_duty: 0 };
    for (const r of regulations) t[r.defaultStatus]++;
    return t;
  }, [regulations]);

  // Per-tab counts for the filter chips.
  const tabCounts = useMemo(() => {
    const counts = new Map<Tab, number>([["All", regulations.length]]);
    for (const c of REGULATION_CATEGORIES) {
      counts.set(c, regulations.filter((r) => r.category === c).length);
    }
    return counts;
  }, [regulations]);

  const visible = useMemo(
    () => (tab === "All" ? regulations : regulations.filter((r) => r.category === tab)),
    [tab, regulations],
  );

  return (
    <div className="space-y-6">
      {/* Compliance summary bar */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile status="compliant" count={totals.compliant} />
        <SummaryTile status="action_required" count={totals.action_required} />
        <SummaryTile status="upcoming_duty" count={totals.upcoming_duty} />
      </div>

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Compliance categories"
        className="flex flex-wrap gap-2"
      >
        {(["All", ...REGULATION_CATEGORIES] as Tab[]).map((c) => {
          const active = tab === c;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(c)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {c}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  active ? "bg-primary-foreground/20" : "bg-muted",
                )}
              >
                {tabCounts.get(c) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards grid — each card opens its own full detail page */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((reg) => (
          <RegulationCard key={reg.id} reg={reg} />
        ))}
      </div>
    </div>
  );
}

function SummaryTile({
  status,
  count,
}: {
  status: RegulationDefaultStatus;
  count: number;
}) {
  const meta = STATUS_META[status];
  const ring = {
    success: "border-success/30",
    danger: "border-danger/30",
    warning: "border-warning/40",
  }[meta.tone];
  const tint = {
    success: "bg-success/15 text-success",
    danger: "bg-danger/15 text-danger",
    warning: "bg-warning/20 text-warning-foreground",
  }[meta.tone];
  const Icon = meta.Icon;
  return (
    <Card className={cn("border", ring)}>
      <CardContent className="flex items-center gap-3 py-4">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", tint)}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-2xl font-semibold leading-none">{count}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {meta.summaryLabel}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RegulationCard({ reg }: { reg: ComplianceRegulation }) {
  return (
    <Link
      href={`/compliance/guide/${reg.id}`}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusIndicator status={reg.defaultStatus} />
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight">
        {reg.title}
      </h3>

      <Badge tone="neutral" className="mt-2 w-fit gap-1">
        <Scale className="h-3 w-3" />
        {shortLegalRef(reg.legalReference)}
      </Badge>

      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
        {reg.summary}
      </p>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
        <ListChecks className="h-3.5 w-3.5 shrink-0" />
        {reg.keyPoints.length} key points for landlords
      </div>

      <div className="mt-auto flex items-start gap-1.5 pt-4 text-xs text-muted-foreground">
        <Clock className="mt-px h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-2">{reg.timeline}</span>
      </div>
    </Link>
  );
}
