"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createTaxStatementAction,
  type TaxActionState,
} from "@/actions/tax-statement";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label, Select } from "@/components/ui/input";
import { TaxBandLabel, type TaxBand } from "@/lib/tax";

export function CreateTaxStatementDialog({ years }: { years: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Create new tax statement
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Create a tax statement</DialogTitle>
            <DialogDescription>
              Generate an estimate for a tax year, split across beneficial owners.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <Form
              years={years}
              onCancel={() => setOpen(false)}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Form({
  years,
  onCancel,
  onDone,
}: {
  years: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<TaxActionState, FormData>(
    createTaxStatementAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, state.at, onDone, router]);

  const bands: TaxBand[] = ["BASIC", "HIGHER", "ADDITIONAL"];

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="ts-year">Tax year</Label>
        <Select id="ts-year" name="taxYear" defaultValue={years[0]}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ts-band">Marginal rate</Label>
          <Select id="ts-band" name="band" defaultValue="BASIC">
            {bands.map((b) => (
              <option key={b} value={b}>
                {TaxBandLabel[b]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ts-allowance">Expense basis</Label>
          <Select id="ts-allowance" name="allowance" defaultValue="0">
            <option value="0">Actual expenses</option>
            <option value="1">£1,000 property allowance</option>
          </Select>
        </div>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate statement"}
        </Button>
      </DialogFooter>
    </form>
  );
}
