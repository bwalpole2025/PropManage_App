"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const base =
  "rounded-full border px-3 py-1 text-sm font-medium transition-colors";
const activeCls = "border-primary bg-primary text-primary-foreground";
const idleCls = "border-border bg-card text-foreground hover:bg-muted";

/** Clickable owner chips — filter the displayed estimate to one owner's share. */
export function TaxOwnerChips({
  owners,
  active,
}: {
  owners: { id: string; name: string }[];
  active?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function setOwner(id?: string) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("owner", id);
    else next.delete("owner");
    router.push(`/tax?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Filter by owner
      </span>
      <button
        type="button"
        onClick={() => setOwner()}
        className={cn(base, !active ? activeCls : idleCls)}
      >
        Whole portfolio
      </button>
      {owners.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setOwner(o.id)}
          className={cn(base, active === o.id ? activeCls : idleCls)}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}
