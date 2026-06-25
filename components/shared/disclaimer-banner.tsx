import { Info } from "lucide-react";
import { Banner } from "@/components/ui/banner";

/**
 * "Not tax advice" disclaimer. Render this wherever a tax figure is shown.
 * Thin wrapper over the shared Banner primitive (warning tone).
 */
export function DisclaimerBanner({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <Banner
      tone="warning"
      icon={<Info className="h-4 w-4" />}
      className={className}
    >
      {text ??
        "This is an automated estimate to help you plan — it is not tax advice. Confirm figures with a qualified accountant."}
    </Banner>
  );
}
