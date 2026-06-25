"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { importTransactionsAction, type ImportState } from "@/actions/bank";
import { Button, type ButtonProps } from "@/components/ui/button";
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

export function ImportTransactionsButton({
  label = "Import file",
  variant = "secondary",
  className,
}: {
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<ImportState, FormData>(
    async (prev, fd) => {
      const res = await importTransactionsAction(prev, fd);
      if (res.created) {
        setOpen(false);
        router.refresh();
      }
      return res;
    },
    {},
  );

  return (
    <>
      <Button
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Upload className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Import transactions</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: <code>date, description, amount</code>{" "}
              (and optionally <code>category, property</code>).
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="file">CSV file</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
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
                {pending ? "Importing…" : "Import"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
