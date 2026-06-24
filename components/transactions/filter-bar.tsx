"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

export function FilterBar({
  properties,
}: {
  properties: { id: string; addressLine1: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/transactions?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="h-9 w-auto"
        value={params.get("propertyId") ?? ""}
        onChange={(e) => update("propertyId", e.target.value)}
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
        value={params.get("direction") ?? ""}
        onChange={(e) => update("direction", e.target.value)}
      >
        <option value="">Income & expenses</option>
        <option value="INCOME">Income only</option>
        <option value="EXPENSE">Expenses only</option>
      </Select>

      <Select
        className="h-9 w-auto"
        value={params.get("uncategorised") ?? ""}
        onChange={(e) => update("uncategorised", e.target.value)}
      >
        <option value="">All</option>
        <option value="1">Uncategorised only</option>
      </Select>
    </div>
  );
}
