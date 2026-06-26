"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import {
  updatePropertyAction,
  type PropertyActionState,
} from "@/actions/property";
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
import { Input, Label, Select } from "@/components/ui/input";
import { RentFrequency, RentFrequencyLabel } from "@/lib/enums";

const EPC_RATINGS = ["A", "B", "C", "D", "E", "F", "G"] as const;

export interface EditPropertyValues {
  currentValuePence: number | null;
  purchasePricePence: number | null;
  purchaseDate: Date | string | null;
  rentalIncomeAmountPence: number | null;
  rentalIncomeFrequency: string;
  isFHL: boolean;
  furnished: boolean | null;
  epcRating: string | null;
  epcScore: number | null;
  epcExpiryDate: Date | string | null;
  portfolioId: string;
}

const pounds = (p: number | null) => (p != null ? (p / 100).toFixed(2) : "");
const dateInput = (d: Date | string | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export function EditPropertyDialog({
  propertyId,
  values,
  portfolios,
}: {
  propertyId: string;
  values: EditPropertyValues;
  portfolios: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-4 w-4" /> Edit information
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Edit property information</DialogTitle>
            <DialogDescription>
              Valuation, purchase, rental, portfolio and EPC details.
            </DialogDescription>
          </DialogHeader>
          {/* Mounted only while open so useActionState resets on every reopen. */}
          {open ? (
            <EditPropertyForm
              propertyId={propertyId}
              values={values}
              portfolios={portfolios}
              onCancel={() => setOpen(false)}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditPropertyForm({
  propertyId,
  values,
  portfolios,
  onCancel,
  onDone,
}: {
  propertyId: string;
  values: EditPropertyValues;
  portfolios: { id: string; name: string }[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<PropertyActionState, FormData>(
    updatePropertyAction.bind(null, propertyId),
    {},
  );

  useEffect(() => {
    // Fresh-mounted per open, so state.ok flips undefined→true exactly once.
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ep-value">Current value (£)</Label>
          <Input
            id="ep-value"
            name="currentValue"
            inputMode="decimal"
            defaultValue={pounds(values.currentValuePence)}
            placeholder="340000"
          />
        </div>
        <div>
          <Label htmlFor="ep-purchase">Purchase price (£)</Label>
          <Input
            id="ep-purchase"
            name="purchasePrice"
            inputMode="decimal"
            defaultValue={pounds(values.purchasePricePence)}
            placeholder="285000"
          />
        </div>
        <div>
          <Label htmlFor="ep-purchaseDate">Purchase date</Label>
          <Input
            id="ep-purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={dateInput(values.purchaseDate)}
          />
        </div>
        <div>
          <Label htmlFor="ep-portfolio">Portfolio</Label>
          <Select
            id="ep-portfolio"
            name="portfolioId"
            defaultValue={values.portfolioId}
          >
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ep-rent">Headline rent (£)</Label>
          <Input
            id="ep-rent"
            name="rentalIncome"
            inputMode="decimal"
            defaultValue={pounds(values.rentalIncomeAmountPence)}
            placeholder="1250"
          />
        </div>
        <div>
          <Label htmlFor="ep-rentFreq">Rent frequency</Label>
          <Select
            id="ep-rentFreq"
            name="rentalIncomeFrequency"
            defaultValue={values.rentalIncomeFrequency}
          >
            {Object.values(RentFrequency).map((f) => (
              <option key={f} value={f}>
                {RentFrequencyLabel[f]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ep-epcRating">EPC rating</Label>
          <Select
            id="ep-epcRating"
            name="epcRating"
            defaultValue={values.epcRating ?? ""}
          >
            <option value="">Not recorded</option>
            {EPC_RATINGS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ep-epcScore">EPC score (1–100)</Label>
          <Input
            id="ep-epcScore"
            name="epcScore"
            type="number"
            min={1}
            max={100}
            defaultValue={values.epcScore ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="ep-epcExpiry">EPC expiry</Label>
          <Input
            id="ep-epcExpiry"
            name="epcExpiryDate"
            type="date"
            defaultValue={dateInput(values.epcExpiryDate)}
          />
        </div>
        <div>
          <Label htmlFor="ep-fhl">Furnished holiday let</Label>
          <Select
            id="ep-fhl"
            name="isFHL"
            defaultValue={values.isFHL ? "true" : "false"}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ep-furnished">Furnished</Label>
          <Select
            id="ep-furnished"
            name="furnished"
            defaultValue={values.furnished ? "true" : "false"}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </div>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
