// Pure aggregation helpers shared by the report builders — category roll-ups,
// money-in/out splits and calendar-month bucketing. Operate on a minimal txn
// shape so they're unit-testable without prisma.

import { TxnDirection } from "@/lib/enums";
import { categoryLabel } from "@/lib/categories";

export interface AggTxn {
  direction: string;
  amountPence: number;
  category: string | null;
  date: Date;
}

export const isIncome = (t: { direction: string }) => t.direction === TxnDirection.INCOME;
export const isExpense = (t: { direction: string }) => t.direction === TxnDirection.EXPENSE;

export function sumIn(txns: { direction: string; amountPence: number }[]): number {
  return txns.filter(isIncome).reduce((s, t) => s + t.amountPence, 0);
}
export function sumOut(txns: { direction: string; amountPence: number }[]): number {
  return txns.filter(isExpense).reduce((s, t) => s + t.amountPence, 0);
}

export interface CategoryGroup {
  category: string;
  label: string;
  count: number;
  amountPence: number;
}

/** Group a set of transactions by category, summing amounts. Sorted by amount desc. */
export function groupByCategory(
  txns: { amountPence: number; category: string | null }[],
): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const t of txns) {
    const key = t.category ?? "__uncat__";
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.amountPence += t.amountPence;
    } else {
      map.set(key, {
        category: key,
        label: t.category ? categoryLabel(t.category) : "Uncategorised",
        count: 1,
        amountPence: t.amountPence,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.amountPence - a.amountPence);
}

/** "YYYY-MM" sort key for a date (UTC). */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "Apr 2025" label for a month. */
export function monthLabel(date: Date): string {
  return monthFmt.format(date);
}

export interface MonthBucket<T> {
  key: string;
  label: string;
  /** First day of the month (UTC), for sorting/date cells. */
  monthStart: Date;
  items: T[];
}

/** Bucket items into calendar months, oldest first. */
export function bucketByMonth<T>(items: T[], dateOf: (item: T) => Date): MonthBucket<T>[] {
  const map = new Map<string, MonthBucket<T>>();
  for (const item of items) {
    const d = dateOf(item);
    const key = monthKey(d);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        key,
        label: monthLabel(d),
        monthStart: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
        items: [],
      };
      map.set(key, bucket);
    }
    bucket.items.push(item);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}
