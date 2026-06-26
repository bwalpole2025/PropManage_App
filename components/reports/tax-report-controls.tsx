"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label, Select } from "@/components/ui/input";
import { TaxBandLabel, type TaxBand } from "@/lib/tax";

export function TaxReportControls({ years }: { years: string[] }) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/reports/tax-statement?${next.toString()}`);
  }

  const bands: TaxBand[] = ["BASIC", "HIGHER", "ADDITIONAL"];

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <Label htmlFor="ty">Tax year</Label>
        <Select
          id="ty"
          className="h-9 w-auto"
          value={params.get("ty") ?? years[0]}
          onChange={(e) => update("ty", e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="band">Marginal rate</Label>
        <Select
          id="band"
          className="h-9 w-auto"
          value={params.get("band") ?? "BASIC"}
          onChange={(e) => update("band", e.target.value)}
        >
          {bands.map((b) => (
            <option key={b} value={b}>
              {TaxBandLabel[b]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="allowance">Expense basis</Label>
        <Select
          id="allowance"
          className="h-9 w-auto"
          value={params.get("allowance") ?? ""}
          onChange={(e) => update("allowance", e.target.value)}
        >
          <option value="">Actual expenses</option>
          <option value="1">£1,000 property allowance</option>
        </Select>
      </div>
    </div>
  );
}
