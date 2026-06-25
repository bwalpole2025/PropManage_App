"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { BellItem } from "@/components/layout/notification-bell";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsList({ items: initial }: { items: BellItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [, start] = useTransition();
  const hasUnread = items.some((i) => !i.readAt);

  function open(item: BellItem) {
    if (!item.readAt) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
      start(() => markNotificationReadAction(item.id));
    }
    if (item.href) router.push(item.href);
  }

  function markAll() {
    setItems((prev) =>
      prev.map((i) => (i.readAt ? i : { ...i, readAt: new Date().toISOString() })),
    );
    start(() => markAllNotificationsReadAction());
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-2xl">🔔</span>}
        title="No notifications yet"
        description="Payment and rent alerts will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAll}>
            Mark all read
          </Button>
        </div>
      ) : null}
      <Card>
        <CardContent className="p-0">
          {items.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => open(i)}
              className={cn(
                "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-muted",
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
                <span className="text-sm text-muted-foreground">{i.body}</span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {formatDate(i.createdAt)}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
