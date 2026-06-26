"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import {
  addCustomCategoryAction,
  type DocumentActionState,
} from "@/actions/document";
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
import { Input, Label } from "@/components/ui/input";

export function AddCustomCategoryDialog({
  variant = "outline",
}: {
  variant?: "outline" | "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(
    addCustomCategoryAction,
    {},
  );

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, state.at, open, router]);

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <FolderPlus className="h-4 w-4" /> Add custom category
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add a custom category</DialogTitle>
            <DialogDescription>
              Group documents under a label that suits your portfolio.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="name">Category name</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={60}
                placeholder="e.g. Service contracts"
                autoFocus
              />
            </div>
            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Adding…" : "Add category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
