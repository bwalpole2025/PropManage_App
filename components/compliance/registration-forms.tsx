"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  saveLandlordRegistrationAction,
  savePrsdAction,
  saveRightToRentAction,
  type ComplianceActionState,
} from "@/actions/compliance";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PrsdStatus,
  PrsdStatusLabel,
  RegistrationStatus,
  RegistrationStatusLabel,
  RightToRentStatus,
  RightToRentStatusLabel,
} from "@/lib/enums";

function dateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

function Feedback({ state }: { state: ComplianceActionState }) {
  if (state.error) return <p className="text-xs text-danger">{state.error}</p>;
  if (state.ok)
    return (
      <p className="flex items-center gap-1 text-xs text-success">
        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
      </p>
    );
  return null;
}

export function RegistrationForm({
  registration,
}: {
  registration: {
    ombudsmanScheme: string | null;
    ombudsmanRef: string | null;
    ombudsmanRenewalDate: Date | string | null;
    status: string;
  } | null;
}) {
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    saveLandlordRegistrationAction,
    {},
  );
  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="omb-status">Membership status</Label>
          <Select
            id="omb-status"
            name="status"
            defaultValue={registration?.status ?? RegistrationStatus.NOT_REGISTERED}
          >
            {Object.values(RegistrationStatus).map((s) => (
              <option key={s} value={s}>
                {RegistrationStatusLabel[s]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="omb-renewal">Renewal date</Label>
          <Input
            id="omb-renewal"
            name="ombudsmanRenewalDate"
            type="date"
            defaultValue={dateInput(registration?.ombudsmanRenewalDate)}
          />
        </div>
        <div>
          <Label htmlFor="omb-scheme">Scheme</Label>
          <Input
            id="omb-scheme"
            name="ombudsmanScheme"
            defaultValue={registration?.ombudsmanScheme ?? ""}
            placeholder="PRS Landlord Ombudsman"
          />
        </div>
        <div>
          <Label htmlFor="omb-ref">Membership reference</Label>
          <Input
            id="omb-ref"
            name="ombudsmanRef"
            defaultValue={registration?.ombudsmanRef ?? ""}
            placeholder="Reference no."
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save registration"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function PrsdRow({
  property,
}: {
  property: {
    id: string;
    addressLine1: string;
    prsdId: string | null;
    prsdStatus: string | null;
    prsdRegisteredDate: Date | string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    savePrsdAction,
    {},
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border-t border-border py-3">
      <input type="hidden" name="propertyId" value={property.id} />
      <div className="min-w-[10rem] flex-1">
        <p className="text-sm font-medium">{property.addressLine1}</p>
      </div>
      <div>
        <Label htmlFor={`prsd-status-${property.id}`} className="text-xs">
          Status
        </Label>
        <Select
          id={`prsd-status-${property.id}`}
          name="prsdStatus"
          defaultValue={property.prsdStatus ?? PrsdStatus.NOT_REGISTERED}
          className="h-9 w-auto text-sm"
        >
          {Object.values(PrsdStatus).map((s) => (
            <option key={s} value={s}>
              {PrsdStatusLabel[s]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`prsd-id-${property.id}`} className="text-xs">
          PRSD ID
        </Label>
        <Input
          id={`prsd-id-${property.id}`}
          name="prsdId"
          defaultValue={property.prsdId ?? ""}
          className="h-9 w-36"
          placeholder="PRSD-…"
        />
      </div>
      <div>
        <Label htmlFor={`prsd-date-${property.id}`} className="text-xs">
          Registered
        </Label>
        <Input
          id={`prsd-date-${property.id}`}
          name="prsdRegisteredDate"
          type="date"
          defaultValue={dateInput(property.prsdRegisteredDate)}
          className="h-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="outline" className="h-9" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function RightToRentRow({
  tenant,
}: {
  tenant: {
    id: string;
    name: string;
    propertyLabel: string;
    rightToRentStatus: string | null;
    rightToRentExpiry: Date | string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    saveRightToRentAction,
    {},
  );
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3 border-t border-border py-3">
      <input type="hidden" name="tenantId" value={tenant.id} />
      <div className="min-w-[10rem] flex-1">
        <p className="text-sm font-medium">{tenant.name}</p>
        <p className="text-xs text-muted-foreground">{tenant.propertyLabel}</p>
      </div>
      <div>
        <Label htmlFor={`rtr-status-${tenant.id}`} className="text-xs">
          Status
        </Label>
        <Select
          id={`rtr-status-${tenant.id}`}
          name="rightToRentStatus"
          defaultValue={tenant.rightToRentStatus ?? RightToRentStatus.UNLIMITED}
          className="h-9 w-auto text-sm"
        >
          {Object.values(RightToRentStatus).map((s) => (
            <option key={s} value={s}>
              {RightToRentStatusLabel[s]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`rtr-exp-${tenant.id}`} className="text-xs">
          Re-check by
        </Label>
        <Input
          id={`rtr-exp-${tenant.id}`}
          name="rightToRentExpiry"
          type="date"
          defaultValue={dateInput(tenant.rightToRentExpiry)}
          className="h-9"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="outline" className="h-9" disabled={pending}>
          {pending ? "…" : "Save"}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
