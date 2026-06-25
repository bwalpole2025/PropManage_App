"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc/react";
import { propertyCreateSchema, type PropertyCreateInput } from "@/schemas/property";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { PropertyType, PropertyTypeLabel } from "@/lib/enums";

/**
 * Add-property form: React Hook Form + Zod (shared schema) calling the tRPC
 * `properties.create` mutation, then invalidating the TanStack Query cache.
 * Proves forms + typed API end to end.
 */
export function AddPropertyForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyCreateInput>({
    resolver: zodResolver(propertyCreateSchema),
    defaultValues: { propertyType: PropertyType.FLAT },
  });

  const create = trpc.properties.create.useMutation({
    onSuccess: async (property) => {
      await utils.properties.list.invalidate();
      router.push(`/properties/${property.id}`);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => create.mutate(values))}
      className="space-y-4"
      noValidate
    >
      <div>
        <Label htmlFor="addressLine1">Address line 1</Label>
        <Input id="addressLine1" {...register("addressLine1")} />
        <FieldError message={errors.addressLine1?.message} />
      </div>
      <div>
        <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
        <Input id="addressLine2" {...register("addressLine2")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" {...register("city")} />
          <FieldError message={errors.city?.message} />
        </div>
        <div>
          <Label htmlFor="postcode">Postcode</Label>
          <Input id="postcode" {...register("postcode")} />
          <FieldError message={errors.postcode?.message} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="propertyType">Property type</Label>
          <Select id="propertyType" {...register("propertyType")}>
            {Object.values(PropertyType).map((t) => (
              <option key={t} value={t}>
                {PropertyTypeLabel[t]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input id="bedrooms" type="number" min="0" {...register("bedrooms")} />
          <FieldError message={errors.bedrooms?.message} />
        </div>
      </div>

      {create.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {create.error.message}
        </p>
      ) : null}

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting || create.isPending}>
          {create.isPending ? "Saving…" : "Save property"}
        </Button>
        <Link href="/properties">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-danger">{message}</p>;
}
