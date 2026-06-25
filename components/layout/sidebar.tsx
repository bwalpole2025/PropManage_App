"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  Calculator,
  FileCheck2,
  FolderClock,
  BarChart3,
  Settings,
} from "lucide-react";
import { SidebarNavItem } from "./sidebar-nav-item";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "My Properties", icon: Building2 },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/tax", label: "Tax", icon: Calculator },
  { href: "/mtd", label: "MTD", icon: FileCheck2 },
  { href: "/files", label: "Files & Dates", icon: FolderClock },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <SidebarNavItem
          key={item.href}
          href={item.href}
          label={item.label}
          icon={item.icon}
          active={
            pathname === item.href || pathname.startsWith(item.href + "/")
          }
        />
      ))}
    </nav>
  );
}
