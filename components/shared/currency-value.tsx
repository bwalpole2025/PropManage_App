import { formatPence } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Render integer pence as GBP, optionally tinted by sign/direction. */
export function CurrencyValue({
  pence,
  signed = false,
  tone,
  className,
}: {
  pence: number;
  signed?: boolean;
  tone?: "income" | "expense" | "auto";
  className?: string;
}) {
  const colour =
    tone === "income"
      ? "text-success"
      : tone === "expense"
        ? "text-danger"
        : tone === "auto"
          ? pence >= 0
            ? "text-success"
            : "text-danger"
          : undefined;

  const prefix = signed && pence > 0 ? "+" : "";
  return (
    <span className={cn("tabular-nums", colour, className)}>
      {prefix}
      {formatPence(pence)}
    </span>
  );
}
