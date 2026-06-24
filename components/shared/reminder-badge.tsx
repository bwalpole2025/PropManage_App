import { Badge } from "@/components/ui/badge";
import { daysUntil, relativeDays } from "@/lib/format";

/**
 * Maps a days-to-expiry value to a colour tier matching the compliance
 * reminder thresholds (30 / 14 / 7 / 1 days). Shared by Compliance and Files.
 */
export function reminderTier(days: number): {
  tone: "neutral" | "info" | "warning" | "danger" | "success";
  label: string;
} {
  if (days < 0) return { tone: "danger", label: "Expired" };
  if (days <= 1) return { tone: "danger", label: "Due now" };
  if (days <= 7) return { tone: "warning", label: "Due soon" };
  if (days <= 14) return { tone: "info", label: "Upcoming" };
  if (days <= 30) return { tone: "neutral", label: "Approaching" };
  return { tone: "success", label: "Valid" };
}

export function ReminderBadge({
  date,
  withRelative = true,
}: {
  date: Date | string;
  withRelative?: boolean;
}) {
  const days = daysUntil(date);
  const tier = reminderTier(days);
  return (
    <Badge tone={tier.tone}>
      {tier.label}
      {withRelative ? ` · ${relativeDays(date)}` : ""}
    </Badge>
  );
}
