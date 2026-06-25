"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronRight, PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NAV,
  SIDEBAR_COOKIE,
  isNavActive,
  type NavGroup,
} from "./nav-config";
import { SidebarNavItem } from "./sidebar-nav-item";
import { AccountMenu } from "./account-menu";
import type { MembershipContext } from "@/lib/auth/active-org";

export function AppSidebar({
  defaultCollapsed,
  memberships,
  activeId,
  userEmail,
  userName,
  accountName,
}: {
  defaultCollapsed: boolean;
  memberships: MembershipContext[];
  activeId: string;
  userEmail: string;
  userName: string;
  accountName: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggleCollapse() {
    setCollapsed((v) => {
      const next = !v;
      // Persist across reloads; read SSR-side in the layout to avoid a flash.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000`;
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border",
          collapsed ? "justify-center px-0" : "gap-2 px-4",
        )}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <Building2 className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed ? (
            <span className="truncate text-lg font-semibold">PropManage</span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Collapse sidebar"
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Account dropdown (shows email) */}
      <div
        className={cn(
          "border-b border-border",
          collapsed ? "flex justify-center p-2" : "p-3",
        )}
      >
        <AccountMenu
          memberships={memberships}
          activeId={activeId}
          userEmail={userEmail}
          userName={userName}
          accountName={accountName}
          collapsed={collapsed}
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV.map((node) =>
          node.kind === "leaf" ? (
            <SidebarNavItem
              key={node.href}
              href={node.href}
              label={node.label}
              icon={node.icon}
              active={isNavActive(pathname, node.href)}
              collapsed={collapsed}
            />
          ) : (
            <NavGroupRow
              key={node.label}
              node={node}
              pathname={pathname}
              collapsed={collapsed}
              open={
                expanded[node.label] ??
                node.children.some((c) => isNavActive(pathname, c.href))
              }
              onToggle={() =>
                setExpanded((s) => ({
                  ...s,
                  [node.label]: !(
                    s[node.label] ??
                    node.children.some((c) => isNavActive(pathname, c.href))
                  ),
                }))
              }
            />
          ),
        )}
      </nav>

      {/* Expand control when collapsed */}
      {collapsed ? (
        <div className="flex justify-center border-t border-border p-2">
          <button
            type="button"
            onClick={toggleCollapse}
            aria-label="Expand sidebar"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function NavGroupRow({
  node,
  pathname,
  collapsed,
  open,
  onToggle,
}: {
  node: NavGroup;
  pathname: string;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = node.icon;
  const groupActive =
    isNavActive(pathname, node.href) ||
    node.children.some((c) => isNavActive(pathname, c.href));

  // Collapsed: a single icon linking to the primary child.
  if (collapsed) {
    return (
      <SidebarNavItem
        href={node.href}
        label={node.label}
        icon={node.icon}
        active={groupActive}
        collapsed
      />
    );
  }

  return (
    <div>
      <div
        className={cn(
          "relative flex items-center rounded-md text-sm font-medium",
          groupActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {groupActive ? (
          <span
            className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
            aria-hidden
          />
        ) : null}
        <Link
          href={node.href}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-l-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground",
            groupActive && "bg-primary/10",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{node.label}</span>
        </Link>
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${open ? "Collapse" : "Expand"} ${node.label}`}
          aria-expanded={open}
          className={cn(
            "rounded-r-md p-2 transition-colors hover:bg-muted hover:text-foreground",
            groupActive && "bg-primary/10",
          )}
        >
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
          />
        </button>
      </div>
      {open ? (
        <div className="mt-1 flex flex-col gap-1 pl-4">
          {node.children.map((c) => (
            <SidebarNavItem
              key={c.href}
              href={c.href}
              label={c.label}
              icon={c.icon}
              active={isNavActive(pathname, c.href)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
