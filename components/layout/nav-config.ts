import type { LucideIcon } from "lucide-react";
import {
  Home,
  ArrowUpDown,
  Building2,
  Users2,
  KeyRound,
  Calculator,
  FileCheck2,
  FolderClock,
  FileText,
  StickyNote,
  BellRing,
  CalendarDays,
  BarChart3,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";

/** Cookie that persists the sidebar collapsed state (read SSR-side, set client-side). */
export const SIDEBAR_COOKIE = "pm_sidebar_collapsed";

export type NavLeaf = {
  kind: "leaf";
  href: string;
  label: string;
  icon: LucideIcon;
};
export type NavGroup = {
  kind: "group";
  label: string;
  icon: LucideIcon;
  /** The parent links to its primary child and also toggles the chevron. */
  href: string;
  children: NavLeaf[];
};
export type NavNode = NavLeaf | NavGroup;

/** Sidebar structure, in order, per the app-shell spec. */
export const NAV: NavNode[] = [
  { kind: "leaf", href: "/dashboard", label: "Overview", icon: Home },
  { kind: "leaf", href: "/transactions", label: "Transactions", icon: ArrowUpDown },
  {
    kind: "group",
    label: "My properties",
    icon: Building2,
    href: "/properties",
    children: [
      { kind: "leaf", href: "/properties", label: "Properties", icon: Building2 },
      { kind: "leaf", href: "/ownership", label: "Ownership", icon: Users2 },
      { kind: "leaf", href: "/tenancies", label: "Tenancies", icon: KeyRound },
    ],
  },
  { kind: "leaf", href: "/tax", label: "Tax", icon: Calculator },
  { kind: "leaf", href: "/mtd", label: "MTD", icon: FileCheck2 },
  { kind: "leaf", href: "/compliance", label: "Compliance", icon: ShieldCheck },
  {
    kind: "group",
    label: "Files & Dates",
    icon: FolderClock,
    href: "/files/documents",
    children: [
      { kind: "leaf", href: "/files/documents", label: "Documents", icon: FileText },
      { kind: "leaf", href: "/files/notes", label: "Notes", icon: StickyNote },
      { kind: "leaf", href: "/files/reminders", label: "Reminders", icon: BellRing },
      { kind: "leaf", href: "/files/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  { kind: "leaf", href: "/reports", label: "Reports", icon: BarChart3 },
  { kind: "leaf", href: "/help", label: "Help", icon: HelpCircle },
];

/** Map of cumulative path keys → breadcrumb label, covering every route. */
export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Overview",
  transactions: "Transactions",
  "transactions/new": "Add transaction",
  "transactions/reconcile": "Reconcile",
  properties: "My properties",
  "properties/new": "Add property",
  ownership: "Ownership",
  tenancies: "Tenancies",
  tax: "Tax",
  mtd: "MTD",
  compliance: "Compliance",
  "compliance/guide": "Compliance guide",
  "compliance/info": "Landlord information",
  "compliance/hazards": "Hazards & repairs",
  "compliance/pets": "Pet requests",
  "compliance/registrations": "Registrations",
  files: "Files & Dates",
  "files/documents": "Documents",
  "files/notes": "Notes",
  "files/reminders": "Reminders",
  "files/calendar": "Calendar",
  reports: "Reports",
  help: "Help",
  settings: "Settings",
  "settings/organization": "Organisation",
  "settings/security": "Security",
  "settings/team": "Team",
};

/** Active when the path equals the href, or is nested under it (except /dashboard). */
export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
