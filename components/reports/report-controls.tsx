"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label, Select, Input } from "@/components/ui/input";
import {
  ALL_EXPENSE_CATEGORIES,
  ALL_INCOME_CATEGORIES,
  allCategoryLabel,
} from "@/lib/categories";
import {
  PERIOD_PRESETS,
  PERIOD_PRESET_LABELS,
  type PeriodPreset,
} from "@/lib/reports/filters";
import type { ReportFilterConfig } from "@/lib/reports/registry";

interface Option {
  id: string;
  name: string;
}

export function ReportControls({
  slug,
  config,
  portfolios,
  companies,
  taxYears,
}: {
  slug: string;
  config: ReportFilterConfig;
  portfolios: Option[];
  companies: Option[];
  taxYears: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/reports/${slug}?${next.toString()}`);
  }

  const selectClass = "h-9 w-auto";
  const preset = (params.get("period") as PeriodPreset | null) ?? "this-tax-year";

  return (
    <div className="flex flex-wrap items-end gap-4">
      {config.taxYear ? (
        <div>
          <Label htmlFor="ty">Tax year</Label>
          <Select
            id="ty"
            className={selectClass}
            value={params.get("ty") ?? taxYears[0]}
            onChange={(e) => update({ ty: e.target.value })}
          >
            {taxYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {config.period ? (
        <>
          <div>
            <Label htmlFor="period">Period</Label>
            <Select
              id="period"
              className={selectClass}
              value={preset}
              onChange={(e) =>
                update(
                  e.target.value === "custom"
                    ? { period: e.target.value }
                    : { period: e.target.value, from: "", to: "" },
                )
              }
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {PERIOD_PRESET_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
          {preset === "custom" ? (
            <>
              <div>
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  className="h-9 w-auto"
                  defaultValue={params.get("from") ?? ""}
                  onChange={(e) => update({ from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  className="h-9 w-auto"
                  defaultValue={params.get("to") ?? ""}
                  onChange={(e) => update({ to: e.target.value })}
                />
              </div>
            </>
          ) : null}
        </>
      ) : null}

      {config.portfolio ? (
        <div>
          <Label htmlFor="portfolioId">Portfolio</Label>
          <Select
            id="portfolioId"
            className={selectClass}
            value={params.get("portfolioId") ?? ""}
            onChange={(e) => update({ portfolioId: e.target.value })}
          >
            <option value="">All portfolios</option>
            {portfolios.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {config.company && companies.length > 0 ? (
        <div>
          <Label htmlFor="companyId">Company</Label>
          <Select
            id="companyId"
            className={selectClass}
            value={params.get("companyId") ?? ""}
            onChange={(e) => update({ companyId: e.target.value })}
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {config.txnFilters ? (
        <>
          <div>
            <Label htmlFor="direction">Direction</Label>
            <Select
              id="direction"
              className={selectClass}
              value={params.get("direction") ?? ""}
              onChange={(e) => update({ direction: e.target.value })}
            >
              <option value="">Income &amp; expenses</option>
              <option value="INCOME">Income only</option>
              <option value="EXPENSE">Expenses only</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              className={selectClass}
              value={params.get("category") ?? ""}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">All categories</option>
              <optgroup label="Income">
                {ALL_INCOME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {allCategoryLabel[c]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Expenses">
                {ALL_EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {allCategoryLabel[c]}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
