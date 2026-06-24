import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Not tax advice" disclaimer. Render this wherever a tax figure is shown.
 */
export function DisclaimerBanner({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {text ??
          "This is an automated estimate to help you plan — it is not tax advice. Confirm figures with a qualified accountant."}
      </p>
    </div>
  );
}
