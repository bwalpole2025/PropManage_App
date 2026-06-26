"use client";

import { useState, useTransition } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { triggerCalculationAction, getCalculationAction, type CalculationView } from "@/actions/mtd";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPence } from "@/lib/format";

const POLL_MS = 1500;
const MAX_ATTEMPTS = 20;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface InitialCalc {
  status: string;
  kind: string;
  incomeTaxAndNicsDuePence: number | null;
  totalIncomePence: number | null;
  totalAllowancesAndDeductionsPence: number | null;
  totalTaxableIncomePence: number | null;
}

export function CalculationCard({
  taxYear,
  connected,
  initial,
}: {
  taxYear: string;
  connected: boolean;
  initial?: InitialCalc | null;
}) {
  const seed: CalculationView | null =
    initial && initial.status === "READY"
      ? {
          calculationId: "",
          status: "READY",
          estimateOrCrystallised: initial.kind === "crystallised" ? "crystallised" : "estimate",
          incomeTaxAndNicsDuePence: initial.incomeTaxAndNicsDuePence ?? undefined,
          totalIncomePence: initial.totalIncomePence ?? undefined,
          totalAllowancesAndDeductionsPence: initial.totalAllowancesAndDeductionsPence ?? undefined,
          totalTaxableIncomePence: initial.totalTaxableIncomePence ?? undefined,
        }
      : null;

  const [calc, setCalc] = useState<CalculationView | null>(seed);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    setCalc(null); // clear stale figures so the recompute shows "calculating…"
    start(async () => {
      const t = await triggerCalculationAction({ taxYear });
      if (t.error || !t.calculationId) {
        setError(t.error ?? "Could not start the calculation.");
        return;
      }
      let attempts = 0;
      // Poll until HMRC finishes computing (PENDING -> READY).
      while (attempts++ < MAX_ATTEMPTS) {
        const r = await getCalculationAction({ calculationId: t.calculationId, taxYear });
        if (r.error || !r.calculation) {
          setError(r.error ?? "Could not fetch the calculation.");
          return;
        }
        setCalc(r.calculation);
        if (r.calculation.status !== "PENDING") return;
        await sleep(POLL_MS);
      }
      // Still pending after the bounded poll — don't spin forever.
      setError("HMRC is still calculating — try again shortly.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> HMRC tax calculation
          </CardTitle>
          <CardDescription>
            HMRC computes your estimated Income Tax &amp; NICs from your submitted updates.
          </CardDescription>
        </div>
        <Button onClick={run} disabled={!connected || pending} variant="outline" size="sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          {calc ? "Recalculate" : "Get calculation"}
        </Button>
      </CardHeader>
      <CardContent>
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {!calc && !pending && !error ? (
          <p className="text-sm text-muted-foreground">
            {connected
              ? "Run a calculation to see HMRC's figure for the year."
              : "Connect to HMRC to retrieve a calculation."}
          </p>
        ) : null}

        {calc?.status === "PENDING" || (pending && !calc) ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> HMRC is calculating…
          </p>
        ) : null}

        {calc?.status === "READY" ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Income Tax &amp; NICs due</p>
                <p className="text-3xl font-semibold tabular-nums text-primary">
                  {formatPence(calc.incomeTaxAndNicsDuePence ?? 0)}
                </p>
              </div>
              <Badge tone={calc.estimateOrCrystallised === "crystallised" ? "success" : "neutral"}>
                {calc.estimateOrCrystallised === "crystallised" ? "Crystallised" : "Estimate"}
              </Badge>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat label="Total income" pence={calc.totalIncomePence} />
              <Stat label="Allowances & deductions" pence={calc.totalAllowancesAndDeductionsPence} />
              <Stat label="Taxable income" pence={calc.totalTaxableIncomePence} />
            </dl>
          </div>
        ) : null}

        {calc?.status === "ERROR" ? (
          <p className="text-sm text-danger">HMRC returned an error for this calculation.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Stat({ label, pence }: { label: string; pence?: number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">
        {pence == null ? "—" : formatPence(pence)}
      </dd>
    </div>
  );
}
