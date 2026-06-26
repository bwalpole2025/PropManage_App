"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import {
  createTenancyState,
  type TenancyActionState,
} from "@/actions/property";
import { updateTenancyAction } from "@/actions/tenancy";
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
import {
  DepositScheme,
  RentFrequency,
  RentFrequencyLabel,
  TenancyStatus,
  TenancyStatusLabel,
} from "@/lib/enums";
import { DepositSchemeLabel } from "@/lib/deposit-scheme";

export interface TenancyEditValues {
  id: string;
  leadTenantName: string;
  leadTenantEmail: string | null;
  propertyId: string;
  propertyAddress: string;
  rentPence: number;
  rentFrequency: string;
  rentDueDay: number | null;
  depositPence: number | null;
  depositScheme: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  status: string;
}

const pounds = (p: number | null) => (p != null ? (p / 100).toFixed(2) : "");
const dateInput = (d: Date | string | null) =>
  d ? new Date(d).toISOString().slice(0, 10) : "";

export function TenancyFormDialog({
  mode,
  properties = [],
  tenancy,
}: {
  mode: "add" | "edit";
  properties?: { id: string; addressLine1: string }[];
  tenancy?: TenancyEditValues;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = mode === "edit";
  return (
    <>
      {isEdit ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add tenancy
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit tenancy" : "Add a tenancy"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? tenancy?.propertyAddress
                : "We'll build the expected-rent schedule from these details."}
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <Form
              mode={mode}
              properties={properties}
              tenancy={tenancy}
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
  mode,
  properties,
  tenancy,
  onCancel,
  onDone,
}: {
  mode: "add" | "edit";
  properties: { id: string; addressLine1: string }[];
  tenancy?: TenancyEditValues;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const action = isEdit
    ? updateTenancyAction.bind(null, tenancy!.id)
    : createTenancyState;
  const [state, formAction, pending] = useActionState<TenancyActionState, FormData>(
    action,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, state.at, onDone, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="t-name">Lead tenant</Label>
          <Input
            id="t-name"
            name="tenantName"
            required={!isEdit}
            defaultValue={tenancy?.leadTenantName ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="t-email">Tenant email</Label>
          <Input
            id="t-email"
            name="tenantEmail"
            type="email"
            defaultValue={tenancy?.leadTenantEmail ?? ""}
          />
        </div>
      </div>

      {!isEdit ? (
        <div>
          <Label htmlFor="t-property">Property</Label>
          <Select id="t-property" name="propertyId" required defaultValue="">
            <option value="" disabled>
              Choose a property
            </option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.addressLine1}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="t-rent">Rent (£)</Label>
          <Input
            id="t-rent"
            name="rent"
            inputMode="decimal"
            required={!isEdit}
            placeholder="1250"
            defaultValue={pounds(tenancy?.rentPence ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="t-freq">Frequency</Label>
          <Select
            id="t-freq"
            name="rentFrequency"
            defaultValue={tenancy?.rentFrequency ?? RentFrequency.MONTHLY}
          >
            {Object.values(RentFrequency).map((f) => (
              <option key={f} value={f}>
                {RentFrequencyLabel[f]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="t-dueday">Due day</Label>
          <Input
            id="t-dueday"
            name="rentDueDay"
            type="number"
            min="1"
            max="31"
            placeholder="1"
            defaultValue={tenancy?.rentDueDay ?? ""}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="t-deposit">Deposit (£)</Label>
          <Input
            id="t-deposit"
            name="deposit"
            inputMode="decimal"
            placeholder="1500"
            defaultValue={pounds(tenancy?.depositPence ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="t-scheme">Deposit scheme</Label>
          <Select
            id="t-scheme"
            name="depositScheme"
            defaultValue={tenancy?.depositScheme ?? DepositScheme.DPS}
          >
            {Object.values(DepositScheme).map((s) => (
              <option key={s} value={s}>
                {DepositSchemeLabel[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="t-start">Start date</Label>
          <Input
            id="t-start"
            name="startDate"
            type="date"
            required={!isEdit}
            defaultValue={dateInput(tenancy?.startDate ?? null)}
          />
        </div>
        <div>
          <Label htmlFor="t-end">End date (optional)</Label>
          <Input
            id="t-end"
            name="endDate"
            type="date"
            defaultValue={dateInput(tenancy?.endDate ?? null)}
          />
        </div>
      </div>

      {isEdit ? (
        <div>
          <Label htmlFor="t-status">Status</Label>
          <Select
            id="t-status"
            name="status"
            defaultValue={tenancy?.status ?? TenancyStatus.ACTIVE}
          >
            {Object.values(TenancyStatus).map((s) => (
              <option key={s} value={s}>
                {TenancyStatusLabel[s]}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add tenancy"}
        </Button>
      </DialogFooter>
    </form>
  );
}
