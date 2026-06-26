"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Send } from "lucide-react";
import {
  submitQuarterlyUpdateAction,
  submitEopsAction,
  submitFinalDeclarationAction,
  type ClientHints,
} from "@/actions/mtd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatPence } from "@/lib/format";

type Kind = "quarterly" | "eops" | "final";

export interface SubmitSummary {
  income: { rentIncome: number; premiumsOfLeaseGrant: number; otherPropertyIncome: number };
  expenses: {
    premisesRunningCosts: number;
    repairsAndMaintenance: number;
    financialCosts: number;
    professionalFees: number;
    costOfServices: number;
    other: number;
  };
}

function clientHints(): ClientHints {
  const off = -new Date().getTimezoneOffset(); // minutes east of UTC
  const sign = off >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0");
  const mm = String(Math.abs(off) % 60).padStart(2, "0");
  return {
    screens: `width=${screen.width}&height=${screen.height}&scaling-factor=${window.devicePixelRatio || 1}&colour-depth=${screen.colorDepth}`,
    windowSize: `width=${window.innerWidth}&height=${window.innerHeight}`,
    timezone: `UTC${sign}${hh}:${mm}`,
  };
}

const ROW = (label: string, pence: number) => ({ label, pence });

export function HmrcSubmitDialog({
  kind,
  taxYear,
  periodKey,
  calculationId,
  triggerLabel,
  title,
  warning,
  summary,
  disabled,
  buttonVariant = "primary",
  buttonSize = "sm",
}: {
  kind: Kind;
  taxYear: string;
  periodKey?: string;
  calculationId?: string;
  triggerLabel: string;
  title: string;
  warning: string;
  summary?: SubmitSummary;
  disabled?: boolean;
  buttonVariant?: "primary" | "outline";
  buttonSize?: "sm" | "md";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok?: boolean; receiptId?: string; error?: string } | null>(null);

  function close() {
    setOpen(false);
    setConfirm("");
    setResult(null);
  }

  function submit() {
    setResult(null);
    start(async () => {
      const hints = clientHints();
      let res: { ok?: boolean; receiptId?: string; error?: string };
      if (kind === "quarterly") {
        res = await submitQuarterlyUpdateAction({ periodKey: periodKey!, taxYear, confirm, clientHints: hints });
      } else if (kind === "eops") {
        res = await submitEopsAction({ taxYear, confirm, clientHints: hints });
      } else {
        res = await submitFinalDeclarationAction({ taxYear, calculationId: calculationId!, confirm, clientHints: hints });
      }
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const incomeRows = summary
    ? [
        ROW("Rents received", summary.income.rentIncome),
        ROW("Premiums of lease grant", summary.income.premiumsOfLeaseGrant),
        ROW("Other property income", summary.income.otherPropertyIncome),
      ].filter((r) => r.pence !== 0)
    : [];
  const expenseRows = summary
    ? [
        ROW("Premises running costs", summary.expenses.premisesRunningCosts),
        ROW("Repairs & maintenance", summary.expenses.repairsAndMaintenance),
        ROW("Financial costs", summary.expenses.financialCosts),
        ROW("Professional fees", summary.expenses.professionalFees),
        ROW("Cost of services", summary.expenses.costOfServices),
        ROW("Other", summary.expenses.other),
      ].filter((r) => r.pence !== 0)
    : [];

  return (
    <>
      <Button size={buttonSize} variant={buttonVariant} disabled={disabled} onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" /> {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-lg">
          <DialogClose onClose={close} />
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Tax year {taxYear}</DialogDescription>
          </DialogHeader>

          {summary ? (
            <div className="mb-4 space-y-3 rounded-md border border-border p-3 text-sm">
              <p className="text-xs font-medium uppercase text-muted-foreground">Income</p>
              {incomeRows.length ? (
                incomeRows.map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="tabular-nums">{formatPence(r.pence)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No income in this period.</p>
              )}
              <p className="pt-1 text-xs font-medium uppercase text-muted-foreground">Expenses</p>
              {expenseRows.length ? (
                expenseRows.map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="tabular-nums">{formatPence(r.pence)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No expenses in this period.</p>
              )}
            </div>
          ) : null}

          <p className="mb-3 flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            {warning} This is sent to HMRC and cannot be undone here.
          </p>

          {result?.ok ? (
            <p className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Submitted. HMRC receipt:{" "}
              <span className="font-mono">{result.receiptId}</span>
            </p>
          ) : (
            <>
              <label className="text-sm">
                Type <span className="font-mono font-semibold">SUBMIT</span> to confirm
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value.toUpperCase())}
                  placeholder="SUBMIT"
                  className="mt-1"
                />
              </label>
              {result?.error ? <p className="mt-2 text-sm text-danger">{result.error}</p> : null}
            </>
          )}

          <DialogFooter>
            {result?.ok ? (
              <Button onClick={close}>Done</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={close} disabled={pending}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={pending || confirm !== "SUBMIT"}>
                  {pending ? "Submitting…" : "Submit to HMRC"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
