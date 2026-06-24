"use client";

import { useState, useTransition } from "react";
import { Building2, Check, ChevronsUpDown, Briefcase } from "lucide-react";
import { setActiveEntityAction } from "@/actions/org";
import { cn } from "@/lib/utils";
import type { MembershipContext } from "@/lib/auth/active-org";
import { LandlordTypeLabel, MembershipRoleLabel } from "@/lib/enums";

export function OrgSwitcher({
  memberships,
  activeId,
}: {
  memberships: MembershipContext[];
  activeId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = memberships.find((m) => m.entityId === activeId);

  // Group: the user's own entities vs clients they have delegated access to.
  const own = memberships.filter((m) => m.isPrincipal);
  const clients = memberships.filter((m) => !m.isPrincipal);

  function choose(entityId: string) {
    setOpen(false);
    if (entityId === activeId) return;
    startTransition(() => setActiveEntityAction(entityId));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-60"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-primary">
          <Building2 className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {active?.entityName ?? "Select account"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {active ? MembershipRoleLabel[active.role as keyof typeof MembershipRoleLabel] ?? active.role : ""}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-card shadow-lg">
            {own.length > 0 ? (
              <Group label="Your accounts">
                {own.map((m) => (
                  <Item
                    key={m.entityId}
                    m={m}
                    active={m.entityId === activeId}
                    onSelect={choose}
                  />
                ))}
              </Group>
            ) : null}
            {clients.length > 0 ? (
              <Group label="Clients (delegated)">
                {clients.map((m) => (
                  <Item
                    key={m.entityId}
                    m={m}
                    active={m.entityId === activeId}
                    onSelect={choose}
                    icon={<Briefcase className="h-4 w-4" />}
                  />
                ))}
              </Group>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-0">
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="pb-1">{children}</div>
    </div>
  );
}

function Item({
  m,
  active,
  onSelect,
  icon,
}: {
  m: MembershipContext;
  active: boolean;
  onSelect: (id: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(m.entityId)}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
        active && "bg-muted/60",
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
        {icon ?? <Building2 className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{m.entityName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {LandlordTypeLabel[m.entityType as keyof typeof LandlordTypeLabel] ??
            m.entityType}{" "}
          · {MembershipRoleLabel[m.role as keyof typeof MembershipRoleLabel] ?? m.role}
        </span>
      </span>
      {active ? <Check className="h-4 w-4 text-primary" /> : null}
    </button>
  );
}
