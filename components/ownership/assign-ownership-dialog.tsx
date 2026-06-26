"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Percent } from "lucide-react";
import {
  assignOwnershipAction,
  type AssignOwnershipState,
} from "@/actions/ownership";
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
import { Input, Label, Select } from "@/components/ui/input";

interface OwnerOpt {
  id: string;
  legalName: string;
}
interface PropertyOpt {
  id: string;
  addressLine1: string;
}
interface PortfolioOpt {
  id: string;
  name: string;
}

export function AssignOwnershipDialog({
  owners,
  properties,
  portfolios,
  ownerId,
  triggerLabel = "Assign ownership",
  triggerVariant = "outline",
  triggerSize = "sm",
}: {
  owners: OwnerOpt[];
  properties: PropertyOpt[];
  portfolios: PortfolioOpt[];
  ownerId?: string;
  triggerLabel?: string;
  triggerVariant?: "outline" | "ghost" | "primary";
  triggerSize?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        <Percent className="h-4 w-4" /> {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Assign ownership</DialogTitle>
            <DialogDescription>
              Give an owner a percentage share of a property, or of every property
              in a portfolio.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <Form
              owners={owners}
              properties={properties}
              portfolios={portfolios}
              ownerId={ownerId}
              onCancel={() => setOpen(false)}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Form({
  owners,
  properties,
  portfolios,
  ownerId,
  onCancel,
  onDone,
}: {
  owners: OwnerOpt[];
  properties: PropertyOpt[];
  portfolios: PortfolioOpt[];
  ownerId?: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<"property" | "portfolio">("property");
  const [state, action, pending] = useActionState<AssignOwnershipState, FormData>(
    assignOwnershipAction,
    {},
  );

  useEffect(() => {
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="ao-owner">Beneficial owner</Label>
        <Select id="ao-owner" name="beneficialOwnerId" defaultValue={ownerId ?? ""} required>
          <option value="" disabled>
            Choose an owner
          </option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>
              {o.legalName}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ao-targetType">Apply to</Label>
          <Select
            id="ao-targetType"
            name="targetType"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as "property" | "portfolio")}
          >
            <option value="property">A property</option>
            <option value="portfolio">A whole portfolio</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ao-percent">Share (%)</Label>
          <Input
            id="ao-percent"
            name="percent"
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            required
            placeholder="50"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="ao-target">
          {targetType === "property" ? "Property" : "Portfolio"}
        </Label>
        <Select id="ao-target" name="targetId" defaultValue="" required>
          <option value="" disabled>
            Choose a {targetType}
          </option>
          {(targetType === "property"
            ? properties.map((p) => ({ id: p.id, label: p.addressLine1 }))
            : portfolios.map((p) => ({ id: p.id, label: p.name }))
          ).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </Select>
        {targetType === "portfolio" ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Applies this share to every property currently in the portfolio.
          </p>
        ) : null}
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign"}
        </Button>
      </DialogFooter>
    </form>
  );
}
