"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";

/** Property + tenant filters for the Notes screen (URL-param driven). */
export function NotesFilterBar({
  properties,
  tenants,
}: {
  properties: { id: string; addressLine1: string }[];
  tenants: { id: string; name: string }[];
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const selectClass = "h-9 w-auto";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className={selectClass}
        value={params.get("propertyId") ?? ""}
        onChange={(e) => update("propertyId", e.target.value)}
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
        className={selectClass}
        value={params.get("tenantId") ?? ""}
        onChange={(e) => update("tenantId", e.target.value)}
        aria-label="Tenant"
      >
        <option value="">All tenants</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
