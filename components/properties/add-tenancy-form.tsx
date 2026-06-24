"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { createTenancyAction } from "@/actions/property";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DepositScheme,
  RentFrequency,
  RentFrequencyLabel,
} from "@/lib/enums";

export function AddTenancyForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" /> Add tenancy
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">New tenancy</h3>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          action={async (fd) => {
            await createTenancyAction(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="propertyId" value={propertyId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tenantName">Lead tenant</Label>
              <Input id="tenantName" name="tenantName" required />
            </div>
            <div>
              <Label htmlFor="tenantEmail">Tenant email</Label>
              <Input id="tenantEmail" name="tenantEmail" type="email" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="rent">Rent (£)</Label>
              <Input id="rent" name="rent" placeholder="1250" required />
            </div>
            <div>
              <Label htmlFor="rentFrequency">Frequency</Label>
              <Select
                id="rentFrequency"
                name="rentFrequency"
                defaultValue={RentFrequency.MONTHLY}
              >
                {Object.values(RentFrequency).map((f) => (
                  <option key={f} value={f}>
                    {RentFrequencyLabel[f]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="rentDueDay">Due day</Label>
              <Input
                id="rentDueDay"
                name="rentDueDay"
                type="number"
                min="1"
                max="31"
                placeholder="1"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" required />
            </div>
            <div>
              <Label htmlFor="depositScheme">Deposit scheme</Label>
              <Select
                id="depositScheme"
                name="depositScheme"
                defaultValue={DepositScheme.DPS}
              >
                {Object.values(DepositScheme).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Save tenancy</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
