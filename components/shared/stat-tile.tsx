import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type Accent = "primary" | "success" | "warning" | "danger" | "neutral";

const accents: Record<Accent, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning-foreground",
  danger: "text-danger",
  neutral: "text-foreground",
};

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: Accent;
  className?: string;
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  accent = "neutral",
  className,
}: MetricCardProps) {
  return (
    <Card className={cn("p-5", className)}>
      <div className="flex items-start justify-between">
        {/* Uppercase grey metric label. */}
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", accents[accent])}>
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </Card>
  );
}

/** Spec name for the metric tile (uppercase label + large value). */
export const MetricCard = StatTile;
