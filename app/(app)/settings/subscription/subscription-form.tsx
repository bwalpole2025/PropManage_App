"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Sparkles, ShieldCheck } from "lucide-react";
import {
  activateSubscriptionAction,
  type AccountFormState,
} from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, formatPence } from "@/lib/format";
import {
  PLAN_NAME,
  PLAN_PRICE_PENCE,
  PAYMENT_PROVIDER,
  planPriceLabel,
  subscriptionView,
} from "@/lib/subscription";

const STATUS_LABEL: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};
const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> =
  {
    trialing: "warning",
    active: "success",
    past_due: "danger",
    canceled: "neutral",
  };

export function SubscriptionForm({
  status: initialStatus,
  trialEndsAt,
  canEdit,
}: {
  status: string;
  trialEndsAt: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    activateSubscriptionAction,
    {},
  );

  const view = subscriptionView({ status, trialEndsAt });
  const trialInFuture =
    !!trialEndsAt && new Date(trialEndsAt).getTime() > Date.now();

  useEffect(() => {
    if (state.success) {
      setStatus("active");
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" /> Subscription
        </CardTitle>
        <CardDescription>Your PropManage plan and billing status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge tone={STATUS_TONE[status] ?? "neutral"}>
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </div>

        <div className="rounded-md border border-border p-3">
          <p className="text-sm font-medium">{PLAN_NAME}</p>
          <p className="text-sm text-muted-foreground">
            {planPriceLabel()} · every feature and all of your data, unlocked.
          </p>
        </div>

        {status === "trialing" ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            {view.daysLeft !== null && trialEndsAt ? (
              <>
                You have <strong>{view.daysLeft}</strong>{" "}
                {view.daysLeft === 1 ? "day" : "days"} left in your free trial —
                it ends on <strong>{formatDate(trialEndsAt)}</strong>. Activate
                now and you won&apos;t be charged until then.
              </>
            ) : (
              <>You&apos;re on a free trial. Activate to keep full access.</>
            )}
          </div>
        ) : status === "active" ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <Sparkles className="h-4 w-4" />
            {trialInFuture ? (
              <>
                Active — your first payment of {formatPence(PLAN_PRICE_PENCE)} is
                scheduled for {formatDate(view.firstChargeDate)}.
              </>
            ) : (
              <>Your subscription is active — thanks for supporting PropManage.</>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Reactivate to restore full access to your portfolio.
          </p>
        )}

        {status !== "active" ? (
          canEdit ? (
            <Button onClick={() => setOpen(true)}>
              <CreditCard className="h-4 w-4" /> Add a payment method &amp;
              activate
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only the account owner can manage billing.
            </p>
          )
        ) : null}

        {state.success ? (
          <p className="text-sm text-success">{state.success}</p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Card billing is handled by {PAYMENT_PROVIDER}&apos;s secure hosted
          checkout — PropManage never sees or stores your card details.
        </p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Activate {PLAN_NAME}</DialogTitle>
            <DialogDescription>{planPriceLabel()}</DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>
                You&apos;ll enter your card on {PAYMENT_PROVIDER}&apos;s secure
                checkout. PropManage never sees your card number.
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              {trialInFuture ? (
                <>
                  You won&apos;t be charged today. Your{" "}
                  <strong>first payment of {formatPence(PLAN_PRICE_PENCE)}</strong>{" "}
                  will be on{" "}
                  <strong>{formatDate(view.firstChargeDate)}</strong>, when your
                  free trial ends.
                </>
              ) : (
                <>
                  Your{" "}
                  <strong>first payment of {formatPence(PLAN_PRICE_PENCE)}</strong>{" "}
                  will be taken today, then {planPriceLabel()}.
                </>
              )}
            </p>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span>
                I agree to the Terms of Service and authorise PropManage to
                charge {planPriceLabel()}
                {trialInFuture ? " after my free trial" : ""}, until I cancel.
              </span>
            </label>

            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!agreed || pending}>
                {pending ? "Activating…" : "Continue to secure checkout"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
