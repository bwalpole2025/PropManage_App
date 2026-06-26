"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createBeneficialOwnerAction,
  type CreateOwnerState,
} from "@/actions/beneficial-owner";
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
import { BeneficialOwnerType, BeneficialOwnerTypeLabel } from "@/lib/enums";

export function AddBeneficialOwnerDialog({
  portfolios,
  companies,
}: {
  portfolios: { id: string; name: string }[];
  companies: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Beneficial Owner
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add a beneficial owner</DialogTitle>
            <DialogDescription>
              The individual or company that owns a share of properties.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <Form
              portfolios={portfolios}
              companies={companies}
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
  portfolios,
  companies,
  onCancel,
  onDone,
}: {
  portfolios: { id: string; name: string }[];
  companies: { id: string; name: string }[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateOwnerState, FormData>(
    createBeneficialOwnerAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="owner-name">Legal name</Label>
        <Input
          id="owner-name"
          name="legalName"
          required
          placeholder="e.g. Jordan Hayes or Acme Ltd"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="owner-type">Type</Label>
          <Select
            id="owner-type"
            name="type"
            defaultValue={BeneficialOwnerType.INDIVIDUAL}
          >
            {Object.values(BeneficialOwnerType).map((t) => (
              <option key={t} value={t}>
                {BeneficialOwnerTypeLabel[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="owner-portfolio">Portfolio (optional)</Label>
          <Select id="owner-portfolio" name="portfolioId" defaultValue="">
            <option value="">—</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {companies.length > 0 ? (
        <div>
          <Label htmlFor="owner-company">Company (optional)</Label>
          <Select id="owner-company" name="companyId" defaultValue="">
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
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
          {pending ? "Adding…" : "Add owner"}
        </Button>
      </DialogFooter>
    </form>
  );
}
