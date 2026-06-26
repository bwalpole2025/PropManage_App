"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui/input";
import { TenancyStatus, TenancyStatusLabel } from "@/lib/enums";

export function TenanciesFilterBar({
  properties,
}: {
  properties: { id: string; addressLine1: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Always read the freshest params at fire-time so a debounced search can't
  // clobber a concurrent filter change made while it was pending.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  function push(key: string, value: string) {
    const next = new URLSearchParams(paramsRef.current.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/tenancies?${next.toString()}`);
  }

  function update(key: string, value: string) {
    if (timer.current) clearTimeout(timer.current); // cancel a pending search
    push(key, value);
  }

  function onSearch(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push("q", value), 400);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        className="h-9 w-56"
        placeholder="Search tenant or address…"
        defaultValue={params.get("q") ?? ""}
        onChange={(e) => onSearch(e.target.value)}
        aria-label="Search"
      />
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
        value={params.get("status") ?? TenancyStatus.ACTIVE}
        onChange={(e) => update("status", e.target.value)}
        aria-label="Status"
      >
        <option value={TenancyStatus.ACTIVE}>Active tenancies</option>
        <option value="all">All statuses</option>
        {Object.values(TenancyStatus)
          .filter((s) => s !== TenancyStatus.ACTIVE)
          .map((s) => (
            <option key={s} value={s}>
              {TenancyStatusLabel[s]}
            </option>
          ))}
      </Select>
      <Select
        className="h-9 w-auto"
        value={params.get("sort") ?? "tenant"}
        onChange={(e) => update("sort", e.target.value)}
        aria-label="Sort"
      >
        <option value="tenant">Tenant A–Z</option>
      </Select>
    </div>
  );
}
