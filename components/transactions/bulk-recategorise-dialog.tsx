"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkRecategoriseTransactionsAction } from "@/actions/transaction";
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
import {
  ALL_EXPENSE_CATEGORIES,
  ALL_INCOME_CATEGORIES,
  allCategoryLabel,
  subcategoriesFor,
} from "@/lib/categories";

export function BulkRecategoriseDialog({
  open,
  onOpenChange,
  ids,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ids: string[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [pending, start] = useTransition();
  const subs = subcategoriesFor(category);

  function apply() {
    if (!category) return;
    start(async () => {
      await bulkRecategoriseTransactionsAction(ids, category, subcategory || null);
      onOpenChange(false);
      onDone();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>
            Recategorise {ids.length} transaction{ids.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Apply one category to every selected transaction. Rent payments are
            linked to their tenancy automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bulk-cat">Category</Label>
            <Select
              id="bulk-cat"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
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
          {subs.length > 0 ? (
            <div>
              <Label htmlFor="bulk-sub">Subcategory (optional)</Label>
              <Select
                id="bulk-sub"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              >
                <option value="">None</option>
                {subs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={pending || !category}>
            {pending ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
