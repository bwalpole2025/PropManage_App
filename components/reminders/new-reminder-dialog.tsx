"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  createReminderAction,
  type ReminderActionState,
} from "@/actions/reminder";
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
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ImportantDateKind, ImportantDateKindLabel } from "@/lib/enums";

export function NewReminderDialog({
  properties,
  tenancies,
}: {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<ReminderActionState, FormData>(
    createReminderAction,
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
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New reminder
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>New reminder</DialogTitle>
            <DialogDescription>
              It&apos;ll appear under &quot;My work&quot; and on your calendar.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Renew gas cert" />
              </div>
              <div>
                <Label htmlFor="dueDate">Due date</Label>
                <Input id="dueDate" name="dueDate" type="date" required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="kind">Type</Label>
                <Select id="kind" name="kind" defaultValue={ImportantDateKind.CUSTOM}>
                  {Object.values(ImportantDateKind).map((k) => (
                    <option key={k} value={k}>
                      {ImportantDateKindLabel[k]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="propertyId">Property (optional)</Label>
                <Select id="propertyId" name="propertyId" defaultValue="">
                  <option value="">None</option>
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
                  <option value="">None</option>
                  {tenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
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
                {pending ? "Saving…" : "Create reminder"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
