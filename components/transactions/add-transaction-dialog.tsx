"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addTransactionAction, type AddTransactionState } from "@/actions/transaction";
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
  ALL_EXPENSE_CATEGORIES,
  ALL_INCOME_CATEGORIES,
  allCategoryLabel,
  subcategoriesFor,
} from "@/lib/categories";

export function AddTransactionDialog({
  properties,
  tenancies,
}: {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const router = useRouter();
  const [state, action, pending] = useActionState<AddTransactionState, FormData>(
    addTransactionAction,
    {},
  );
  const subs = subcategoriesFor(category);

  // On a successful save, close the dialog and refresh so the row appears.
  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add transaction
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add a transaction</DialogTitle>
            <DialogDescription>
              Record rent received or an expense, categorised for tax.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  name="category"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a category…
                  </option>
                  <optgroup label="Income">
                    {ALL_INCOME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {allCategoryLabel[c]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Expenses">
                    {ALL_EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {allCategoryLabel[c]}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </div>
              <div>
                <Label htmlFor="subcategory">Subcategory (optional)</Label>
                <Select
                  id="subcategory"
                  name="subcategory"
                  defaultValue=""
                  disabled={subs.length === 0}
                >
                  <option value="">{subs.length ? "None" : "—"}</option>
                  {subs.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="amount">Amount (£)</Label>
                <Input id="amount" name="amount" placeholder="1250.00" required />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="propertyId">Property (optional)</Label>
                <Select id="propertyId" name="propertyId" defaultValue="">
                  <option value="">No specific property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.addressLine1}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="tenancyId">Tenancy (optional)</Label>
                <Select id="tenancyId" name="tenancyId" defaultValue="">
                  <option value="">No specific tenancy</option>
                  {tenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="merchant">Merchant / payee (optional)</Label>
                <Input id="merchant" name="merchant" />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input id="notes" name="notes" />
              </div>
            </div>
            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
