"use client";

import { useState, useTransition } from "react";
import { CreditCard, Sparkles } from "lucide-react";
import { activateSubscriptionAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { daysUntil, formatDate } from "@/lib/format";

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
  const [status, setStatus] = useState(initialStatus);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const days =
    trialEndsAt && status === "trialing"
      ? Math.max(0, daysUntil(trialEndsAt))
      : null;

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

        {status === "trialing" ? (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            {days !== null && trialEndsAt ? (
              <>
                Your free trial ends in <strong>{days}</strong>{" "}
                {days === 1 ? "day" : "days"}, on {formatDate(trialEndsAt)}.
                Activate now to keep full access.
              </>
            ) : (
              <>You're on a free trial. Activate to keep full access.</>
            )}
          </div>
        ) : status === "active" ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <Sparkles className="h-4 w-4" /> Your subscription is active — thanks
            for supporting PropManage.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Reactivate to restore full access to your portfolio.
          </p>
        )}

        {status !== "active" ? (
          <div className="flex items-center gap-3">
            <Button
              disabled={!canEdit || pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await activateSubscriptionAction();
                  if (res.success) setStatus("active");
                  setMsg(res.success ?? res.error ?? null);
                })
              }
            >
              {pending ? "Activating…" : "Activate subscription"}
            </Button>
            {!canEdit ? (
              <p className="text-sm text-muted-foreground">
                Only the account owner can manage billing.
              </p>
            ) : null}
            {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Billing is mocked in this build — no card is charged.
        </p>
      </CardContent>
    </Card>
  );
}
