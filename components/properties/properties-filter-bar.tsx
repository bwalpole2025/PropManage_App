"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

export function PropertiesFilterBar({
  portfolios,
  taxYears,
}: {
  portfolios: { id: string; name: string }[];
  taxYears: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/properties?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="h-9 w-auto"
        value={params.get("portfolio") ?? ""}
        onChange={(e) => update("portfolio", e.target.value)}
        aria-label="Portfolio"
      >
        <option value="">All portfolios</option>
        {portfolios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>

      <Select
        className="h-9 w-auto"
        value={params.get("taxYear") ?? taxYears[0]}
        onChange={(e) => update("taxYear", e.target.value)}
        aria-label="Tax year"
      >
        {taxYears.map((y) => (
          <option key={y} value={y}>
            Tax year {y}
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
