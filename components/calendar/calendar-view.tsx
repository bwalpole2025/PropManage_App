"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatPenceCompact } from "@/lib/format";
import {
  CALENDAR_TYPES,
  CALENDAR_TYPE_META,
  WEEKDAY_LABELS,
  addDaysKey,
  addMonthsKey,
  dayKeyInTz,
  formatDayTitle,
  formatMonthYear,
  formatWeekTitle,
  monthMatrix,
  weekDays,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/calendar";

type View = "month" | "week" | "day";

interface Props {
  events: CalendarEvent[];
  timeZone: string;
  view: View;
  focusedKey: string;
  todayKey: string;
  enabledTypes: CalendarEventType[];
}

export function CalendarView({
  events,
  timeZone,
  view,
  focusedKey,
  todayKey,
  enabledTypes,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Bucket events into day-keys using the account time zone.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const enabled = new Set(enabledTypes);
    for (const e of events) {
      if (!enabled.has(e.type)) continue;
      const k = dayKeyInTz(e.date, timeZone);
      const list = map.get(k);
      if (list) list.push(e);
      else map.set(k, [e]);
    }
    return map;
  }, [events, timeZone, enabledTypes]);

  function push(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function navigate(delta: number) {
    const nextKey =
      view === "month"
        ? addMonthsKey(focusedKey, delta)
        : addDaysKey(focusedKey, delta * (view === "week" ? 7 : 1));
    push({ date: nextKey });
  }

  function setType(type: CalendarEventType, on: boolean) {
    const set = new Set(enabledTypes);
    if (on) set.add(type);
    else set.delete(type);
    const list = CALENDAR_TYPES.filter((t) => set.has(t));
    // All enabled → drop the param (default).
    push({ types: list.length === CALENDAR_TYPES.length ? null : list.join(",") });
  }

  const heading =
    view === "month"
      ? formatMonthYear(focusedKey)
      : view === "week"
        ? `${formatWeekTitle(focusedKey)} · ${formatMonthYear(focusedKey)}`
        : formatDayTitle(focusedKey);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => push({ date: todayKey })}>
            Today
          </Button>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => navigate(-1)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => navigate(1)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{heading}</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => push({ view: v === "month" ? null : v })}
                className={cn(
                  "rounded px-3 py-1 text-sm font-medium capitalize transition-colors",
                  view === v
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <FilterMenu enabledTypes={enabledTypes} onToggle={setType} />
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          focusedKey={focusedKey}
          todayKey={todayKey}
          byDay={byDay}
          onMore={(key) => push({ view: "day", date: key })}
        />
      ) : view === "week" ? (
        <WeekView focusedKey={focusedKey} todayKey={todayKey} byDay={byDay} />
      ) : (
        <DayView focusedKey={focusedKey} byDay={byDay} />
      )}

      <Legend />
    </div>
  );
}

function EventChip({ event }: { event: CalendarEvent }) {
  const meta = CALENDAR_TYPE_META[event.type];
  const prefix =
    event.type === "payment" && event.amountPence != null
      ? `${formatPenceCompact(event.amountPence)} · `
      : "";
  return (
    <Link
      href={event.href}
      title={`${meta.label}: ${event.title}`}
      className={cn(
        "block truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-tight transition-colors",
        meta.chip,
      )}
    >
      {prefix}
      {event.title}
    </Link>
  );
}

function MonthGrid({
  focusedKey,
  todayKey,
  byDay,
  onMore,
}: {
  focusedKey: string;
  todayKey: string;
  byDay: Map<string, CalendarEvent[]>;
  onMore: (key: string) => void;
}) {
  const weeks = monthMatrix(focusedKey);
  const MAX = 3;
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-muted/40">
        {WEEKDAY_LABELS.map((w) => (
          <div
            key={w}
            className="px-2 py-1.5 text-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((cell) => {
          const items = byDay.get(cell.key) ?? [];
          const isToday = cell.key === todayKey;
          return (
            <div
              key={cell.key}
              className={cn(
                "min-h-[96px] border-b border-r border-border p-1 last:border-r-0",
                !cell.inMonth && "bg-muted/20",
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    isToday
                      ? "bg-primary font-semibold text-primary-foreground"
                      : cell.inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60",
                  )}
                >
                  {cell.day}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.slice(0, MAX).map((e) => (
                  <EventChip key={e.id} event={e} />
                ))}
                {items.length > MAX ? (
                  <button
                    type="button"
                    onClick={() => onMore(cell.key)}
                    className="block w-full truncate px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    +{items.length - MAX} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  focusedKey,
  todayKey,
  byDay,
}: {
  focusedKey: string;
  todayKey: string;
  byDay: Map<string, CalendarEvent[]>;
}) {
  const days = weekDays(focusedKey);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
      {days.map((key, i) => {
        const items = byDay.get(key) ?? [];
        const isToday = key === todayKey;
        return (
          <div
            key={key}
            className="rounded-lg border border-border p-2"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {WEEKDAY_LABELS[i]}
              </span>
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {Number(key.slice(8))}
              </span>
            </div>
            <div className="space-y-1">
              {items.length === 0 ? (
                <p className="px-1 text-[11px] text-muted-foreground/60">—</p>
              ) : (
                items.map((e) => <EventChip key={e.id} event={e} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayView({
  focusedKey,
  byDay,
}: {
  focusedKey: string;
  byDay: Map<string, CalendarEvent[]>;
}) {
  const items = byDay.get(focusedKey) ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
        Nothing scheduled for this day.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((e) => {
        const meta = CALENDAR_TYPE_META[e.type];
        return (
          <li key={e.id}>
            <Link
              href={e.href}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.title}</p>
                {e.subtitle ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {e.subtitle}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                {e.type === "payment" && e.amountPence != null ? (
                  <span className="text-sm font-medium tabular-nums">
                    {formatPenceCompact(e.amountPence)}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">{meta.label}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FilterMenu({
  enabledTypes,
  onToggle,
}: {
  enabledTypes: CalendarEventType[];
  onToggle: (type: CalendarEventType, on: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = enabledTypes.length;
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="h-4 w-4" /> Filter
        {active < CALENDAR_TYPES.length ? (
          <span className="ml-1 rounded-full bg-primary/15 px-1.5 text-xs text-primary">
            {active}
          </span>
        ) : null}
      </Button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
            {CALENDAR_TYPES.map((t) => {
              const on = enabledTypes.includes(t);
              const meta = CALENDAR_TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onToggle(t, !on)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {on ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {CALENDAR_TYPES.map((t) => {
        const meta = CALENDAR_TYPE_META[t];
        return (
          <span key={t} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}
