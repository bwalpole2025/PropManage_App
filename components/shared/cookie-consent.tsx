"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  readConsent,
  writeConsent,
  hasCurrentConsent,
  type ConsentChoice,
} from "@/lib/consent";

/**
 * Privacy-first cookie banner. Renders nothing on the server and until mounted
 * (so it never blocks first paint or causes hydration mismatch). Appears only
 * when no current-version choice exists. Re-shows if `clearConsent()` is called
 * (e.g. from Settings → Privacy → "Manage cookie preferences"), which the
 * "pm:consent-reset" event signals without a full reload.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setOpen(!hasCurrentConsent(readConsent()));
    sync();
    window.addEventListener("pm:consent-reset", sync);
    return () => window.removeEventListener("pm:consent-reset", sync);
  }, []);

  if (!open) return null;

  function choose(choice: ConsentChoice) {
    writeConsent(choice);
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-lg sm:flex-row sm:items-center sm:gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Cookie className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1 text-sm">
          <p id="cookie-consent-title" className="font-medium">
            We value your privacy
          </p>
          <p className="text-muted-foreground">
            We use only the cookies needed to sign you in and keep the app
            working. Optional cookies stay off unless you accept them.{" "}
            <Link href="/cookies" className="font-medium text-primary underline">
              Cookie policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => choose("essential")}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => choose("all")}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
