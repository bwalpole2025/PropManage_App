"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import {
  acceptTaxDisclaimerAction,
  type TaxActionState,
} from "@/actions/tax-statement";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The acknowledgement gate. No tax figures are rendered by the server until the
 * user confirms both acknowledgements here (the page checks the cookie this
 * action sets). Continue stays disabled until both boxes are ticked.
 */
export function TaxDisclaimerGate() {
  const router = useRouter();
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [state, action, pending] = useActionState<TaxActionState, FormData>(
    acceptTaxDisclaimerAction,
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, state.at, router]);

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Guidance only — not tax advice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These estimates are automated and for guidance only to help you plan.
              They are <strong>not tax advice</strong> and may not reflect your full
              circumstances. Confirm figures with a qualified accountant before
              relying on them.
            </p>
          </div>
        </div>

        <form action={action} className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3 text-sm">
            <input
              type="checkbox"
              name="ackNotAdvice"
              checked={ack1}
              onChange={(e) => setAck1(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span>
              I understand these estimates are <strong>not tax advice</strong>.
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-md border border-border bg-card p-3 text-sm">
            <input
              type="checkbox"
              name="ackCategorisation"
              checked={ack2}
              onChange={(e) => setAck2(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            />
            <span>
              I understand the figures depend on my transactions being{" "}
              <strong>categorised correctly</strong>.
            </span>
          </label>

          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}

          <Button type="submit" disabled={!ack1 || !ack2 || pending}>
            {pending ? "Confirming…" : "Continue to estimates"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
