"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "open", label: "My work" },
  { id: "completed", label: "Completed" },
] as const;

/** "My work" / "Completed" sub-tabs for the Reminders screen (`?tab=`). */
export function RemindersTabs({
  counts,
}: {
  counts: { open: number; completed: number };
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const current = params.get("tab") === "completed" ? "completed" : "open";

  function go(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id === "open") next.delete("tab");
    else next.set("tab", id);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = current === t.id;
        const badge = t.id === "open" ? counts.open : counts.completed;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-muted-foreground">{badge}</span>
          </button>
        );
      })}
    </div>
  );
}
