"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createPortfolioAction,
  type AddPortfolioState,
} from "@/actions/portfolio";
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
import { PortfolioType, PortfolioTypeLabel } from "@/lib/enums";

export function AddPortfolioDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<AddPortfolioState, FormData>(
    createPortfolioAction,
    {},
  );

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, open, router]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Portfolio
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add a portfolio</DialogTitle>
            <DialogDescription>
              Group properties (e.g. personal vs a company).
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="portfolio-name">Name</Label>
              <Input id="portfolio-name" name="name" required placeholder="e.g. Bristol portfolio" />
            </div>
            <div>
              <Label htmlFor="portfolio-type">Type</Label>
              <Select id="portfolio-type" name="type" defaultValue={PortfolioType.PERSONAL}>
                {Object.values(PortfolioType).map((t) => (
                  <option key={t} value={t}>
                    {PortfolioTypeLabel[t]}
                  </option>
                ))}
              </Select>
            </div>
            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add portfolio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
