"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Archive, RotateCcw } from "lucide-react";
import {
  archivePropertyAction,
  restorePropertyAction,
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

function SubmitButton({
  children,
  variant = "danger",
}: {
  children: React.ReactNode;
  variant?: "danger" | "primary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}

/** Archive (soft-delete) a property behind a confirmation dialog. */
export function ArchivePropertyButton({
  propertyId,
  address,
}: {
  propertyId: string;
  address: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <Archive className="h-4 w-4" /> Archive
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Archive this property?</DialogTitle>
            <DialogDescription>
              {address} will be removed from your active lists. Its transactions
              and history are preserved, and you can restore it at any time.
            </DialogDescription>
          </DialogHeader>
          <form action={archivePropertyAction.bind(null, propertyId)}>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton>Archive property</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Restore an archived property back to the active lists. */
export function RestorePropertyButton({ propertyId }: { propertyId: string }) {
  return (
    <form action={restorePropertyAction.bind(null, propertyId)}>
      <SubmitButton variant="primary">
        <RotateCcw className="h-4 w-4" /> Restore property
      </SubmitButton>
    </form>
  );
}
