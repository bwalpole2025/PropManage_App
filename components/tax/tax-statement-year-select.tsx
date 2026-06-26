"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label, Select } from "@/components/ui/input";

export function TaxStatementYearSelect({
  years,
  selected,
}: {
  years: { taxYearLabel: string }[];
  selected: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function pick(ty: string) {
    const next = new URLSearchParams(params.toString());
    next.set("ty", ty);
    next.delete("owner"); // a different year has its own owner statements
    router.push(`/tax?${next.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="ty-select" className="mb-0">
        Statement
      </Label>
      <Select
        id="ty-select"
        className="h-9 w-auto"
        value={selected}
        onChange={(e) => pick(e.target.value)}
        aria-label="Tax year"
      >
        {years.map((y) => (
          <option key={y.taxYearLabel} value={y.taxYearLabel}>
            Tax year {y.taxYearLabel}
          </option>
        ))}
      </Select>
    </div>
  );
}
