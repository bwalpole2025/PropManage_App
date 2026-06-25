"use client";

import { useActionState } from "react";
import {
  updateOrganizationAction,
  type AccountFormState,
} from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LandlordTypeLabel, type LandlordType } from "@/lib/enums";

interface OrgData {
  displayName: string;
  type: string;
  utr: string | null;
  companyNumber: string | null;
  mtdEnrolled: boolean;
  timeZone: string;
  firstTaxYear: string | null;
}

export function OrganizationForm({
  org,
  timeZones,
  taxYears,
  canEdit,
}: {
  org: OrgData;
  timeZones: string[];
  taxYears: string[];
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateOrganizationAction,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisation</CardTitle>
        <CardDescription>
          Used on your tax records and MTD submissions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">
              {LandlordTypeLabel[org.type as LandlordType] ?? org.type}
            </Badge>
            {org.mtdEnrolled ? <Badge tone="success">MTD enrolled</Badge> : null}
          </div>

          <div>
            <Label htmlFor="displayName">Name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={org.displayName}
              disabled={!canEdit}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="timeZone">Time zone</Label>
              <Select
                id="timeZone"
                name="timeZone"
                defaultValue={org.timeZone}
                disabled={!canEdit}
              >
                {timeZones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="firstTaxYear">
                First tax year to reconcile from
              </Label>
              <Select
                id="firstTaxYear"
                name="firstTaxYear"
                defaultValue={org.firstTaxYear ?? taxYears[0]}
                disabled={!canEdit}
              >
                {taxYears.map((ty) => (
                  <option key={ty} value={ty}>
                    {ty}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="utr">Self Assessment UTR</Label>
              <Input id="utr" defaultValue={org.utr ?? ""} disabled />
            </div>
            {org.companyNumber ? (
              <div>
                <Label htmlFor="companyNumber">Company number</Label>
                <Input
                  id="companyNumber"
                  defaultValue={org.companyNumber}
                  disabled
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={!canEdit || pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            {!canEdit ? (
              <p className="text-sm text-muted-foreground">
                Only the account owner can edit these.
              </p>
            ) : null}
            {state.success ? (
              <p className="text-sm text-success">{state.success}</p>
            ) : null}
            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
