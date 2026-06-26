import { cn } from "@/lib/utils";
import { epcBandTone } from "@/lib/property-finance";

const BANDS = ["A", "B", "C", "D", "E", "F", "G"] as const;

const toneBg: Record<string, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  neutral: "bg-muted text-muted-foreground",
};

/**
 * An EPC A–G band strip. The property's rating is highlighted and widened; the
 * others are dimmed. Colours come from the shared design tokens via epcBandTone.
 */
export function EpcBand({ rating }: { rating: string | null | undefined }) {
  const active = rating?.trim().toUpperCase();

  return (
    <div className="space-y-1.5" role="img" aria-label={`EPC rating ${active ?? "not recorded"}`}>
      {BANDS.map((band, i) => {
        const isActive = band === active;
        const tone = epcBandTone(band);
        return (
          <div
            key={band}
            className={cn(
              "flex items-center justify-between rounded px-3 py-1.5 text-sm font-semibold transition-all",
              toneBg[tone],
              isActive ? "ring-2 ring-foreground/40" : "opacity-40",
            )}
            style={{ width: `${60 + (i * 40) / (BANDS.length - 1)}%` }}
          >
            <span>{band}</span>
            {isActive ? (
              <span className="text-xs uppercase">This property</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
