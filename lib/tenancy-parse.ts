// Shared form-value parsing for the tenancy create/edit actions (pure).

import { poundsToPence } from "./format";

const MONEY_RE = /^\d+(\.\d+)?$/;
const clean = (v: string) => v.replace(/[£,\s]/g, "").trim();

/** Required money field → pence (>0). Throws on non-numeric / non-positive. */
export function parseMoneyRequired(label: string, v: string): number {
  const c = clean(v);
  if (!MONEY_RE.test(c)) throw new Error(`${label} must be a number`);
  const p = poundsToPence(c);
  if (p <= 0) throw new Error(`${label} must be greater than zero`);
  return p;
}

/** Optional money field → pence, undefined when absent/blank. Throws on garbage. */
export function parseMoneyOptional(
  label: string,
  v?: string,
): number | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t === "") return undefined;
  const c = clean(t);
  if (!MONEY_RE.test(c)) throw new Error(`${label} must be a number`);
  return poundsToPence(c);
}

/**
 * Rent due day. `undefined` (field absent) → undefined (leave unchanged on edit);
 * blank → null; otherwise an integer in 1..31. Throws on out-of-range.
 */
export function parseRentDueDay(v?: string): number | null | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  if (!Number.isInteger(n) || n < 1 || n > 31) {
    throw new Error("Rent due day must be between 1 and 31");
  }
  return n;
}
