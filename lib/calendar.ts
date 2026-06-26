// Client-safe calendar helpers. All "day keys" are calendar dates ("YYYY-MM-DD")
// — events (UTC instants) are bucketed into a day using the ACCOUNT time zone,
// while grid/navigation arithmetic is pure calendar math (anchored at UTC noon,
// DST-safe). No prisma imports — usable in both server and client components.

export type CalendarEventType = "payment" | "expiry" | "reminder" | "account";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  /** ISO UTC instant; bucketed to a day in the account time zone. */
  date: string;
  title: string;
  subtitle?: string | null;
  href: string;
  amountPence?: number | null;
}

export const CALENDAR_TYPE_META: Record<
  CalendarEventType,
  { label: string; chip: string; dot: string }
> = {
  payment: {
    label: "Upcoming Payment",
    chip: "bg-success/15 text-success hover:bg-success/25",
    dot: "bg-success",
  },
  expiry: {
    label: "Document expiry",
    chip: "bg-warning/20 text-warning-foreground hover:bg-warning/30",
    dot: "bg-warning",
  },
  reminder: {
    label: "Reminder",
    chip: "bg-accent/15 text-accent hover:bg-accent/25",
    dot: "bg-accent",
  },
  account: {
    label: "Account event",
    chip: "bg-primary/10 text-primary hover:bg-primary/20",
    dot: "bg-primary",
  },
};

export const CALENDAR_TYPES: CalendarEventType[] = [
  "payment",
  "expiry",
  "reminder",
  "account",
];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseDateKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function keyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}`;
}

/** UTC-noon anchor for a calendar date — safe for ±day/month arithmetic. */
function anchor(key: string): Date {
  const { y, m, d } = parseDateKey(key);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** The calendar day (YYYY-MM-DD) an instant falls on, in the given time zone. */
export function dayKeyInTz(date: Date | string, timeZone: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function todayKeyInTz(timeZone: string): string {
  return dayKeyInTz(new Date(), timeZone);
}

export function addDaysKey(key: string, delta: number): string {
  const a = anchor(key);
  a.setUTCDate(a.getUTCDate() + delta);
  return keyOf(a);
}

export function addMonthsKey(key: string, delta: number): string {
  const { y, m, d } = parseDateKey(key);
  const target = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  // Clamp day to the target month's length.
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12),
  ).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return keyOf(target);
}

/** 6×7 month grid (weeks start Monday) for the month containing `key`. */
export function monthMatrix(
  key: string,
): { key: string; day: number; inMonth: boolean }[][] {
  const { y, m } = parseDateKey(key);
  const first = new Date(Date.UTC(y, m - 1, 1, 12));
  const firstDow = (first.getUTCDay() + 6) % 7; // 0 = Monday
  const start = new Date(first);
  start.setUTCDate(1 - firstDow);

  const weeks: { key: string; day: number; inMonth: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const days: { key: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + w * 7 + i);
      days.push({
        key: keyOf(d),
        day: d.getUTCDate(),
        inMonth: d.getUTCMonth() === m - 1,
      });
    }
    weeks.push(days);
  }
  return weeks;
}

/** The 7 day-keys (Mon–Sun) of the week containing `key`. */
export function weekDays(key: string): string[] {
  const a = anchor(key);
  const dow = (a.getUTCDay() + 6) % 7;
  const start = new Date(a);
  start.setUTCDate(a.getUTCDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return keyOf(d);
  });
}

const monthYearFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayTitleFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const weekRangeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "June 2026" for the month containing `key`. */
export function formatMonthYear(key: string): string {
  return monthYearFmt.format(anchor(key));
}

/** "Monday, 15 June 2026" for a day-view header. */
export function formatDayTitle(key: string): string {
  return dayTitleFmt.format(anchor(key));
}

/** "9–15 Jun · June 2026" style label for the week-view header. */
export function formatWeekTitle(key: string): string {
  const days = weekDays(key);
  return `${weekRangeFmt.format(anchor(days[0]))} – ${weekRangeFmt.format(
    anchor(days[6]),
  )}`;
}
