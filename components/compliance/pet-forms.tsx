"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  createPetRequestAction,
  decidePetRequestAction,
  type ComplianceActionState,
} from "@/actions/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PetRequestStatus } from "@/lib/enums";

const today = () => new Date().toISOString().slice(0, 10);

export function PetRequestForm({
  tenancies,
}: {
  tenancies: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    createPetRequestAction,
    {},
  );
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok, state.at]);

  if (tenancies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an active tenancy before logging a pet request.
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" /> Log pet request
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Log a pet request</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="pet-tenancy">Tenancy</Label>
            <Select id="pet-tenancy" name="tenancyId" required>
              {tenancies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pet-desc">Pet</Label>
              <Input id="pet-desc" name="petDescription" required placeholder="e.g. small dog (cockapoo)" />
            </div>
            <div>
              <Label htmlFor="pet-date">Requested on</Label>
              <Input id="pet-date" name="requestedDate" type="date" defaultValue={today()} required />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            You must respond within 28 days (42 if you reasonably request more information) and cannot
            unreasonably refuse.
          </p>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save request"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Decide a pending pet request (approve / request info / refuse-with-reason). */
export function PetDecideForm({ petRequestId }: { petRequestId: string }) {
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    decidePetRequestAction,
    {},
  );
  const [refusing, setRefusing] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="petRequestId" value={petRequestId} />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          name="status"
          defaultValue={PetRequestStatus.APPROVED}
          className="h-8 w-auto text-xs"
          onChange={(e) => setRefusing(e.target.value === PetRequestStatus.REFUSED)}
        >
          <option value={PetRequestStatus.APPROVED}>Approve</option>
          <option value={PetRequestStatus.INFO_REQUESTED}>Request more info</option>
          <option value={PetRequestStatus.REFUSED}>Refuse</option>
        </Select>
        <Button type="submit" variant="outline" className="h-8 px-3 text-xs" disabled={pending}>
          {pending ? "Saving…" : "Record"}
        </Button>
      </div>
      {refusing ? (
        <Textarea
          name="decisionReason"
          rows={2}
          placeholder="Reasonable grounds for refusal (required)"
          className="text-xs"
        />
      ) : null}
      {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
    </form>
  );
}
