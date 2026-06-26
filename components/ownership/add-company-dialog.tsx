"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createCompanyAction,
  type CreateCompanyState,
} from "@/actions/company";
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

export function AddCompanyDialog() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Company
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add a company</DialogTitle>
            <DialogDescription>
              A limited company structure (the basis for a business portfolio).
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <Form onCancel={() => setOpen(false)} onDone={() => setOpen(false)} />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Form({
  onCancel,
  onDone,
}: {
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateCompanyState, FormData>(
    createCompanyAction,
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
        <Label htmlFor="co-name">Company name</Label>
        <Input id="co-name" name="name" required placeholder="e.g. Hayes Lettings Ltd" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="co-number">Company number</Label>
          <Input id="co-number" name="companyNumber" placeholder="09876543" />
        </div>
        <div>
          <Label htmlFor="co-utr">UTR</Label>
          <Input id="co-utr" name="utr" placeholder="10-digit UTR" />
        </div>
      </div>
      <div>
        <Label htmlFor="co-vat">VAT registered</Label>
        <Select id="co-vat" name="vatRegistered" defaultValue="false">
          <option value="false">No</option>
          <option value="true">Yes</option>
        </Select>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add company"}
        </Button>
      </DialogFooter>
    </form>
  );
}
