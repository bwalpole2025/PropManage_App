"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addComplianceDocAction } from "@/actions/property";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  COMPLIANCE_CATEGORIES,
  DocumentCategory,
  DocumentCategoryLabel,
} from "@/lib/enums";

export function AddComplianceForm({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="h-4 w-4" /> Add certificate
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">New certificate / document</h3>
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
            await addComplianceDocAction(fd);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <input type="hidden" name="propertyId" value={propertyId} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="category">Type</Label>
              <Select
                id="category"
                name="category"
                defaultValue={DocumentCategory.GAS_SAFETY}
              >
                {COMPLIANCE_CATEGORIES.map((t) => (
                  <option key={t} value={t}>
                    {DocumentCategoryLabel[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="expiryDate">Expiry date</Label>
              <Input id="expiryDate" name="expiryDate" type="date" required />
            </div>
          </div>
          <div>
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" name="reference" placeholder="Certificate no." />
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll remind you 30, 14, 7 and 1 days before it expires.
          </p>
          <div className="flex gap-2">
            <Button type="submit">Save certificate</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
