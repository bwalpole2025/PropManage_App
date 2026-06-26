"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Map } from "lucide-react";
import {
  setPropertyCameraPositionAction,
  type PropertyActionState,
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
import { Input, Label } from "@/components/ui/input";
import type { CameraPosition } from "@/lib/property-finance";

export function EditCameraDialog({
  propertyId,
  position,
}: {
  propertyId: string;
  position: CameraPosition | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        className="shadow"
      >
        <Map className="h-4 w-4" /> Edit position
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Map camera position</DialogTitle>
            <DialogDescription>
              Set where the property map is centred.
            </DialogDescription>
          </DialogHeader>
          {/* Mounted only while open so useActionState resets on every reopen. */}
          {open ? (
            <EditCameraForm
              propertyId={propertyId}
              position={position}
              onCancel={() => setOpen(false)}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditCameraForm({
  propertyId,
  position,
  onCancel,
  onDone,
}: {
  propertyId: string;
  position: CameraPosition | null;
  onCancel: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<PropertyActionState, FormData>(
    setPropertyCameraPositionAction.bind(null, propertyId),
    {},
  );

  useEffect(() => {
    // Fresh-mounted per open, so state.ok flips undefined→true exactly once.
    if (state.ok) {
      onDone();
      router.refresh();
    }
  }, [state.ok, onDone, router]);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="cam-lat">Latitude</Label>
          <Input
            id="cam-lat"
            name="lat"
            type="number"
            step="any"
            required
            defaultValue={position?.lat ?? ""}
            placeholder="51.4545"
          />
        </div>
        <div>
          <Label htmlFor="cam-lng">Longitude</Label>
          <Input
            id="cam-lng"
            name="lng"
            type="number"
            step="any"
            required
            defaultValue={position?.lng ?? ""}
            placeholder="-2.5879"
          />
        </div>
        <div>
          <Label htmlFor="cam-heading">Heading (°)</Label>
          <Input
            id="cam-heading"
            name="heading"
            type="number"
            step="any"
            defaultValue={position?.heading ?? ""}
            placeholder="0–360"
          />
        </div>
        <div>
          <Label htmlFor="cam-zoom">Zoom</Label>
          <Input
            id="cam-zoom"
            name="zoom"
            type="number"
            step="any"
            defaultValue={position?.zoom ?? ""}
            placeholder="0–22"
          />
        </div>
      </div>
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save position"}
        </Button>
      </DialogFooter>
    </form>
  );
}
