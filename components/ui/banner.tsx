import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type BannerTone = "info" | "success" | "warning" | "danger";

const tones: Record<BannerTone, string> = {
  info: "border-accent/40 bg-accent/10 text-accent",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning-foreground",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: BannerTone;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

/** Inline alert/banner — info / success / warning (trial) / danger (arrears). */
export function Banner({
  tone = "info",
  icon,
  onDismiss,
  className,
  children,
  ...props
}: BannerProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 hover:bg-foreground/10"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
