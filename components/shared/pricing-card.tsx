import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PricingCardProps {
  name: string;
  /** Headline price, e.g. "£4.50" or "Free". */
  priceLabel: string;
  /** Sub-label under the price, e.g. "per month" or "billed £43.20/yr". */
  period?: string;
  description?: string;
  features: string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
  badge?: string;
  className?: string;
}

/** Glassmorphism pricing card (translucent, blurred, soft border). */
export function PricingCard({
  name,
  priceLabel,
  period,
  description,
  features,
  cta,
  ctaHref,
  featured = false,
  badge,
  className,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "glass relative flex flex-col rounded-2xl p-8 text-white",
        featured && "ring-2 ring-accent",
        className,
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground shadow">
          {badge}
        </span>
      ) : null}

      <h3 className="text-lg font-semibold">{name}</h3>
      {description ? (
        <p className="mt-1 text-sm text-white/70">{description}</p>
      ) : null}

      <div className="mt-5 flex items-end gap-1">
        <span className="text-4xl font-bold tracking-tight">{priceLabel}</span>
        {period ? (
          <span className="mb-1 text-sm text-white/70">{period}</span>
        ) : null}
      </div>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-white/90">{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={cn(
          "mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-medium transition-colors",
          featured
            ? "bg-accent text-accent-foreground hover:bg-accent/90"
            : "bg-white text-primary hover:bg-white/90",
        )}
      >
        {cta}
      </Link>
    </div>
  );
}
