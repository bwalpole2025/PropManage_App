"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TxnSource } from "@/lib/enums";
import {
  ALL_EXPENSE_CATEGORIES,
  ALL_INCOME_CATEGORIES,
  allCategoryLabel,
} from "@/lib/categories";

interface Tenancy {
  id: string;
  property: { addressLine1: string };
  tenants: { name: string }[];
}
interface BankAccount {
  id: string;
  name: string;
  accountNumberMasked: string | null;
}

export function FilterBar({
  properties,
  tenancies,
  bankAccounts,
}: {
  properties: { id: string; addressLine1: string }[];
  tenancies: Tenancy[];
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: URLSearchParams) {
    router.push(`/transactions?${next.toString()}`);
  }
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  }
  function updateAmount(key: "min" | "max", value: string) {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => update(key, value), 400);
  }

  const selectClass = "h-9 w-auto";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Bank feed / account (or source when no accounts connected) */}
      {bankAccounts.length > 0 ? (
        <Select
          className={selectClass}
          value={params.get("account") ?? ""}
          onChange={(e) => update("account", e.target.value)}
        >
          <option value="">All accounts</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.accountNumberMasked ? ` ${a.accountNumberMasked}` : ""}
            </option>
          ))}
        </Select>
      ) : (
        <Select
          className={selectClass}
          value={params.get("source") ?? ""}
          onChange={(e) => update("source", e.target.value)}
        >
          <option value="">All sources</option>
          <option value={TxnSource.BANK_FEED}>Bank feed</option>
          <option value={TxnSource.MANUAL}>Manual</option>
          <option value={TxnSource.IMPORTED}>Imported</option>
        </Select>
      )}

      <Select
        className={selectClass}
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
        className={selectClass}
        value={params.get("tenancyId") ?? ""}
        onChange={(e) => update("tenancyId", e.target.value)}
      >
        <option value="">All tenants</option>
        {tenancies.map((t) => (
          <option key={t.id} value={t.id}>
            {t.tenants[0]?.name ?? "Tenant"} · {t.property.addressLine1}
          </option>
        ))}
      </Select>

      <Select
        className={selectClass}
        value={params.get("direction") ?? ""}
        onChange={(e) => update("direction", e.target.value)}
      >
        <option value="">Income &amp; expenses</option>
        <option value="INCOME">Income only</option>
        <option value="EXPENSE">Expenses only</option>
      </Select>

      <Select
        className={selectClass}
        value={params.get("category") ?? ""}
        onChange={(e) => update("category", e.target.value)}
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

      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>£</span>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="min"
          className="h-9 w-20"
          defaultValue={params.get("min") ?? ""}
          onChange={(e) => updateAmount("min", e.target.value)}
        />
        <span>to £</span>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="max"
          className="h-9 w-20"
          defaultValue={params.get("max") ?? ""}
          onChange={(e) => updateAmount("max", e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch
          checked={params.get("showExcluded") === "1"}
          onCheckedChange={(v) => update("showExcluded", v ? "1" : "")}
          aria-label="Show deactivated transactions"
        />
        Show deactivated
      </label>
    </div>
  );
}
