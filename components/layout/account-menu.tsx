"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Check,
  ChevronsUpDown,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown-menu";
import { setActiveEntityAction } from "@/actions/org";
import { logoutAction } from "@/actions/auth";
import { cn } from "@/lib/utils";
import type { MembershipContext } from "@/lib/auth/active-org";
import { LandlordTypeLabel, MembershipRoleLabel } from "@/lib/enums";

/**
 * Sidebar account/profile dropdown (position 2). Shows the user's email, switches
 * between accounts (own vs delegated clients), and offers profile + sign out.
 * Consolidates the former OrgSwitcher and UserMenu.
 */
export function AccountMenu({
  memberships,
  activeId,
  userEmail,
  userName,
  accountName,
  collapsed = false,
}: {
  memberships: MembershipContext[];
  activeId: string;
  userEmail: string;
  userName: string;
  accountName: string;
  collapsed?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const own = memberships.filter((m) => m.isPrincipal);
  const clients = memberships.filter((m) => !m.isPrincipal);
  const initials =
    (userName || userEmail || "?")
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  function switchTo(entityId: string) {
    if (entityId === activeId) return;
    startTransition(() => setActiveEntityAction(entityId));
  }

  return (
    <DropdownMenu>
      <DropdownTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-md text-left text-sm transition-colors hover:bg-muted disabled:opacity-60",
          collapsed
            ? "justify-center p-0"
            : "border border-border bg-card px-2 py-2",
          pending && "opacity-60",
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initials}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{accountName}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {userEmail}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownTrigger>

      <DropdownContent className="w-64">
        {own.length > 0 ? (
          <>
            <DropdownLabel>Your accounts</DropdownLabel>
            {own.map((m) => (
              <AccountItem
                key={m.entityId}
                m={m}
                active={m.entityId === activeId}
                onSelect={() => switchTo(m.entityId)}
              />
            ))}
          </>
        ) : null}
        {clients.length > 0 ? (
          <>
            <DropdownLabel>Clients (delegated)</DropdownLabel>
            {clients.map((m) => (
              <AccountItem
                key={m.entityId}
                m={m}
                active={m.entityId === activeId}
                onSelect={() => switchTo(m.entityId)}
                icon={<Briefcase className="h-3.5 w-3.5" />}
              />
            ))}
          </>
        ) : null}

        <DropdownSeparator />
        <Link
          href="/settings"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <SettingsIcon className="h-4 w-4" /> Profile &amp; settings
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </form>
      </DropdownContent>
    </DropdownMenu>
  );
}

function AccountItem({
  m,
  active,
  onSelect,
  icon,
}: {
  m: MembershipContext;
  active: boolean;
  onSelect: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <DropdownItem onSelect={onSelect} className={cn(active && "bg-muted/60")}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
        {icon ?? <Building2 className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{m.entityName}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {LandlordTypeLabel[m.entityType as keyof typeof LandlordTypeLabel] ??
            m.entityType}{" "}
          ·{" "}
          {MembershipRoleLabel[m.role as keyof typeof MembershipRoleLabel] ??
            m.role}
        </span>
      </span>
      {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
    </DropdownItem>
  );
}
