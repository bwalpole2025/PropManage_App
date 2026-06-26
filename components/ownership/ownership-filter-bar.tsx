"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

export function OwnershipFilterBar({
  properties,
  owners,
}: {
  properties: { id: string; addressLine1: string }[];
  owners: { id: string; legalName: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/ownership?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="h-9 w-auto"
        value={params.get("property") ?? ""}
        onChange={(e) => update("property", e.target.value)}
        aria-label="Property"
      >
        <option value="">All properties</option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.addressLine1}
          </option>
        ))}
      </Select>

      <Select
        className="h-9 w-auto"
        value={params.get("owner") ?? ""}
        onChange={(e) => update("owner", e.target.value)}
        aria-label="Beneficial owner"
      >
        <option value="">All owners</option>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.legalName}
          </option>
        ))}
      </Select>

      <Select
        className="h-9 w-auto"
        value={params.get("sort") ?? "name"}
        onChange={(e) => update("sort", e.target.value)}
        aria-label="Sort"
      >
        <option value="name">Name A–Z</option>
      </Select>
    </div>
  );
}
