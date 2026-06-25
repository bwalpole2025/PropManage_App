"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PricingCard } from "@/components/shared/pricing-card";

const ANNUAL_DISCOUNT = 0.2; // 20% off annual plans

function gbp(n: number): string {
  return `£${n.toFixed(2)}`;
}

export function Pricing({ isAuthed }: { isAuthed: boolean }) {
  const [annual, setAnnual] = useState(false);
  const ctaHref = isAuthed ? "/dashboard" : "/register";

  // Per-month equivalent + billed-annually total for a monthly price.
  const priced = (monthly: number) => {
    if (!annual) return { priceLabel: gbp(monthly), period: "per month" };
    const perMonth = monthly * (1 - ANNUAL_DISCOUNT);
    const perYear = perMonth * 12;
    return {
      priceLabel: gbp(perMonth),
      period: `/mo · billed ${gbp(perYear)}/yr`,
    };
  };

  const starter = priced(4.5);
  const pro = priced(8.5);

  return (
    <section
      id="pricing"
      className="bg-gradient-to-b from-primary to-[hsl(152_42%_18%)] px-6 py-20 md:px-10 md:py-28"
    >
      <div className="mx-auto max-w-5xl text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Simple, honest pricing
        </h2>
        <p className="mt-3 text-white/80">
          Start free. Upgrade as your portfolio grows.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-3">
          <span className={cn("text-sm", !annual && "font-semibold")}>Monthly</span>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            onClick={() => setAnnual((v) => !v)}
            className="relative h-7 w-12 rounded-full bg-white/25 transition-colors"
          >
            <span
              className={cn(
                "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                annual ? "left-6" : "left-1",
              )}
            />
          </button>
          <span className={cn("text-sm", annual && "font-semibold")}>Annual</span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
            Save 20%
          </span>
        </div>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
        <PricingCard
          name="Free"
          priceLabel="Free"
          period="forever"
          description="For getting started"
          features={[
            "1 property",
            "Manual transactions",
            "Compliance reminders",
          ]}
          cta={isAuthed ? "Go to dashboard" : "Get started"}
          ctaHref={ctaHref}
        />
        <PricingCard
          name="Starter"
          priceLabel={starter.priceLabel}
          period={starter.period}
          description="For growing landlords"
          features={[
            "Up to 8 properties",
            "Bank feed reconciliation",
            "SA105 tax estimates",
            "Document storage",
          ]}
          cta={isAuthed ? "Go to dashboard" : "Choose Starter"}
          ctaHref={ctaHref}
        />
        <PricingCard
          name="Pro"
          priceLabel={pro.priceLabel}
          period={pro.period}
          description="For portfolios"
          featured
          badge="Most popular"
          features={[
            "Up to 45 properties",
            "Everything in Starter",
            "MTD quarterly submissions",
            "Delegated accountant access",
          ]}
          cta={isAuthed ? "Go to dashboard" : "Choose Pro"}
          ctaHref={ctaHref}
        />
      </div>
    </section>
  );
}
