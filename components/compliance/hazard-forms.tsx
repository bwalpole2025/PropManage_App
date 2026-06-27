"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  reportHazardAction,
  updateHazardStatusAction,
  type ComplianceActionState,
} from "@/actions/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  HazardCategory,
  HazardCategoryLabel,
  HazardSeverity,
  HazardSeverityLabel,
  HazardStatus,
  HazardStatusLabel,
} from "@/lib/enums";

const today = () => new Date().toISOString().slice(0, 10);

export function ReportHazardForm({
  properties,
}: {
  properties: { id: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    reportHazardAction,
    {},
  );
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok, state.at]);

  if (properties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a property before logging a hazard.
      </p>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" /> Report a hazard
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Report a hazard</h3>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="hz-property">Property</Label>
              <Select id="hz-property" name="propertyId" required>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="hz-category">Hazard type</Label>
              <Select id="hz-category" name="category" defaultValue={HazardCategory.DAMP_MOULD}>
                {Object.values(HazardCategory).map((c) => (
                  <option key={c} value={c}>
                    {HazardCategoryLabel[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="hz-severity">Severity</Label>
              <Select id="hz-severity" name="severity" defaultValue={HazardSeverity.SIGNIFICANT}>
                {Object.values(HazardSeverity).map((s) => (
                  <option key={s} value={s}>
                    {HazardSeverityLabel[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="hz-date">Reported on</Label>
              <Input id="hz-date" name="reportedDate" type="date" defaultValue={today()} required />
            </div>
          </div>
          <div>
            <Label htmlFor="hz-reportedBy">Reported by (optional)</Label>
            <Input id="hz-reportedBy" name="reportedBy" placeholder="Tenant name / channel" />
          </div>
          <div>
            <Label htmlFor="hz-desc">Description</Label>
            <Textarea id="hz-desc" name="description" rows={3} required placeholder="Describe the hazard and location" />
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll set Awaab&apos;s Law deadlines from the severity and remind you before they lapse.
          </p>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Log hazard"}
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

/** Buttons to advance a hazard through its SLA lifecycle. */
export function HazardStatusActions({
  hazardId,
  status,
}: {
  hazardId: string;
  status: string;
}) {
  const next: HazardStatus[] = [];
  if (status === HazardStatus.REPORTED) next.push(HazardStatus.INVESTIGATING);
  if (status === HazardStatus.INVESTIGATING) next.push(HazardStatus.REPAIR_SCHEDULED);
  if (status !== HazardStatus.RESOLVED && status !== HazardStatus.BREACHED)
    next.push(HazardStatus.RESOLVED);
  if (next.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {next.map((s) => (
        <form
          key={s}
          action={async (fd) => {
            await updateHazardStatusAction({}, fd);
          }}
        >
          <input type="hidden" name="hazardId" value={hazardId} />
          <input type="hidden" name="status" value={s} />
          <Button type="submit" variant="outline" className="h-8 px-3 text-xs">
            Mark {HazardStatusLabel[s].toLowerCase()}
          </Button>
        </form>
      ))}
    </div>
  );
}
