import { cn } from "@/lib/utils";

const toneClass = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent",
} as const;

/** A simple determinate progress bar (0–100). */
export function Progress({
  value,
  tone = "primary",
  className,
}: {
  value: number;
  tone?: keyof typeof toneClass;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", toneClass[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
