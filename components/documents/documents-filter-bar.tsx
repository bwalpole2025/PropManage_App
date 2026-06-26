"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";
import {
  DOCUMENT_CATEGORY_GROUPS,
  DocumentCategoryLabel,
  ExpiryWindow,
  ExpiryWindowLabel,
} from "@/lib/enums";

interface Props {
  properties: { id: string; addressLine1: string }[];
  portfolios: { id: string; name: string }[];
  tenancies: { id: string; label: string }[];
  customCategories: { id: string; name: string }[];
}

/** Category / expiry-window / scope filters for the document & receipt lists. */
export function DocumentsFilterBar({
  properties,
  portfolios,
  tenancies,
  customCategories,
}: Props) {
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
        value={params.get("category") ?? ""}
        onChange={(e) => update("category", e.target.value)}
        aria-label="Category"
      >
        <option value="">All categories</option>
        {DOCUMENT_CATEGORY_GROUPS.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.categories.map((c) => (
              <option key={c} value={c}>
                {DocumentCategoryLabel[c]}
              </option>
            ))}
          </optgroup>
        ))}
        {customCategories.length > 0 ? (
          <optgroup label="Custom">
            {customCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </optgroup>
        ) : null}
      </Select>

      <Select
        className={selectClass}
        value={params.get("expiry") ?? ""}
        onChange={(e) => update("expiry", e.target.value)}
        aria-label="Expiry window"
      >
        <option value="">{ExpiryWindowLabel[ExpiryWindow.ANY]}</option>
        {(
          [
            ExpiryWindow.D14,
            ExpiryWindow.D30,
            ExpiryWindow.D90,
            ExpiryWindow.D180,
          ] as const
        ).map((w) => (
          <option key={w} value={w}>
            {ExpiryWindowLabel[w]}
          </option>
        ))}
      </Select>

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
        value={params.get("portfolioId") ?? ""}
        onChange={(e) => update("portfolioId", e.target.value)}
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
        className={selectClass}
        value={params.get("tenancyId") ?? ""}
        onChange={(e) => update("tenancyId", e.target.value)}
        aria-label="Tenancy"
      >
        <option value="">All tenancies</option>
        {tenancies.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
