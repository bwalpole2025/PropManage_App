"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark, Plus, RefreshCw, Unplug, Zap } from "lucide-react";
import {
  disconnectBankConnectionAction,
  reconnectBankConnectionAction,
  simulateIncomingPaymentAction,
} from "@/actions/bank";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

export interface ConnectionRow {
  id: string;
  institutionName: string | null;
  status: string;
  expiresAt: string | null;
  accounts: { id: string; name: string; accountNumberMasked: string | null }[];
}

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "danger" }> = {
  ACTIVE: { label: "Connected", tone: "success" },
  EXPIRED: { label: "Consent expired", tone: "warning" },
  REVOKED: { label: "Disconnected", tone: "neutral" },
  ERROR: { label: "Error", tone: "danger" },
  PENDING: { label: "Pending", tone: "neutral" },
};

export function BankConnectionsManager({
  connections,
}: {
  connections: ConnectionRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function run(id: string, fn: () => Promise<unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusyId(id);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={<Landmark className="h-5 w-5" />}
        title="No bank feeds connected"
        description="Connect a bank to import transactions automatically via open banking."
        action={
          <Link href="/transactions/connect">
            <Button>
              <Plus className="h-4 w-4" /> Connect a bank
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/transactions/connect">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" /> Connect another bank
          </Button>
        </Link>
      </div>

      {connections.map((c) => {
        const status = STATUS[c.status] ?? { label: c.status, tone: "neutral" as const };
        const isActive = c.status === "ACTIVE";
        const isExpired = c.status === "EXPIRED";
        const busy = pending && busyId === c.id;
        return (
          <Card key={c.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Landmark className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium">
                      {c.institutionName ?? "Bank connection"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.expiresAt
                        ? `Consent ${isExpired ? "expired" : "valid until"} ${formatDate(c.expiresAt)}`
                        : "No consent window"}
                    </p>
                  </div>
                </div>
                <Badge tone={status.tone}>{status.label}</Badge>
              </div>

              <ul className="space-y-1 text-sm text-muted-foreground">
                {c.accounts.map((a) => (
                  <li key={a.id} className="flex items-center gap-2">
                    <span>{a.name}</span>
                    {a.accountNumberMasked ? (
                      <span className="text-xs">{a.accountNumberMasked}</span>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                {isExpired ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(c.id, () => reconnectBankConnectionAction(c.id))
                    }
                  >
                    <RefreshCw className="h-4 w-4" /> Reconnect
                  </Button>
                ) : null}
                {isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(c.id, () => simulateIncomingPaymentAction())
                    }
                    title="Dev: inject a sample incoming payment"
                  >
                    <Zap className="h-4 w-4" /> Simulate payment
                  </Button>
                ) : null}
                {c.status !== "REVOKED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      run(
                        c.id,
                        () => disconnectBankConnectionAction(c.id),
                        "Disconnect this bank feed? Imported transactions stay; no new ones will arrive.",
                      )
                    }
                  >
                    <Unplug className="h-4 w-4" /> Disconnect
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
