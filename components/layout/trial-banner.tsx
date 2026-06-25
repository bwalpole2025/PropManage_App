"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { daysUntil } from "@/lib/format";

/**
 * Persistent, dismissible free-trial banner. Renders only for accounts whose
 * subscription is "trialing". Dismissal is stored in localStorage keyed by the
 * account id (+ trial end), so it stays dismissed per account but reappears for
 * a different account or a renewed trial.
 */
export function TrialBanner({
  subscriptionStatus,
  trialEndsAt,
  accountId,
}: {
  subscriptionStatus: string;
  trialEndsAt: string | null;
  accountId: string;
}) {
  const storageKey = `pm.trial-dismissed.${accountId}.${trialEndsAt ?? "none"}`;
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  if (subscriptionStatus !== "trialing") return null;
  if (!mounted || dismissed) return null;

  const days = trialEndsAt ? Math.max(0, daysUntil(trialEndsAt)) : null;
  const lead =
    days === null
      ? "You're on a free trial."
      : `You have ${days} ${days === 1 ? "day" : "days"} left in your free trial.`;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="px-6 pt-4">
      <Banner
        tone="warning"
        icon={<Sparkles className="h-4 w-4" />}
        onDismiss={dismiss}
      >
        {lead} Some functionalities are currently restricted:{" "}
        <Link
          href="/settings"
          className="font-semibold underline underline-offset-2 hover:opacity-80"
        >
          add a payment method
        </Link>
        .
      </Banner>
    </div>
  );
}
