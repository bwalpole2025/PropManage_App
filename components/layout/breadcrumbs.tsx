"use client";

import { usePathname } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { ROUTE_LABELS } from "./nav-config";

const CUID = /^c[a-z0-9]{20,}$/i;

function labelFor(key: string, segment: string): string {
  const mapped = ROUTE_LABELS[key];
  if (mapped) return mapped;
  if (CUID.test(segment)) return "Property"; // dynamic /[propertyId] segment
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/** Breadcrumb trail derived from the current path; updates on every navigation. */
export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const items: BreadcrumbItem[] = [{ label: "Overview", href: "/dashboard" }];
  let href = "";
  let key = "";
  segments.forEach((seg, i) => {
    href += "/" + seg;
    key = key ? key + "/" + seg : seg;
    if (href === "/dashboard") return; // root crumb already added
    const isLast = i === segments.length - 1;
    items.push({ label: labelFor(key, seg), href: isLast ? undefined : href });
  });

  // On /dashboard the trail collapses to a single current crumb.
  if (items.length === 1) return <Breadcrumb items={[{ label: "Overview" }]} />;
  return <Breadcrumb items={items} />;
}
