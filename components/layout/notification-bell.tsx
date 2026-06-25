"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { cn } from "@/lib/utils";

export interface BellItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({
  initialCount,
  initialItems,
}: {
  initialCount: number;
  initialItems: BellItem[];
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [items, setItems] = useState<BellItem[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { count: number; items: BellItem[] };
      setCount(data.count);
      setItems(data.items);
    } catch {
      /* ignore transient polling errors */
    }
  }, []);

  // Poll the unread count (~30s) for near-real-time badge updates.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (res.ok) setCount((await res.json()).count ?? 0);
      } catch {
        /* ignore */
      }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void refresh();
  }

  function onItem(item: BellItem) {
    if (!item.readAt) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
      setCount((c) => Math.max(0, c - 1));
      start(() => markNotificationReadAction(item.id));
    }
    setOpen(false);
    if (item.href) router.push(item.href);
  }

  function markAll() {
    setItems((prev) =>
      prev.map((i) => (i.readAt ? i : { ...i, readAt: new Date().toISOString() })),
    );
    setCount(0);
    start(() => markAllNotificationsReadAction());
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-danger-foreground">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-80 overflow-hidden rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            {count > 0 ? (
              <button
                type="button"
                onClick={markAll}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                You&apos;re all caught up.
              </p>
            ) : (
              items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onItem(i)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left hover:bg-muted",
                    !i.readAt && "bg-primary/5",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {!i.readAt ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    ) : null}
                    {i.title}
                  </span>
                  {i.body ? (
                    <span className="text-xs text-muted-foreground">{i.body}</span>
                  ) : null}
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(i.createdAt)}
                  </span>
                </button>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3 py-2 text-center text-xs text-primary hover:underline"
          >
            View all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
