// Pure per-property helpers (no prisma) shared by the properties services and
// unit-tested in isolation.

import { RentPeriodsPerYear, TenancyStatus, type RentFrequency } from "./enums";
import { annualYieldBp, loanToValueBp } from "./finance";

export type OccupancyStatus = "Occupied" | "Vacant";

/** Sum of ACTIVE tenancies' rent, normalised to a monthly figure (pence). */
export function normaliseMonthlyRentPence(
  tenancies: { status: string; rentPence: number; rentFrequency: string }[],
): number {
  return tenancies
    .filter((t) => t.status === TenancyStatus.ACTIVE)
    .reduce((sum, t) => {
      const perYear = RentPeriodsPerYear[t.rentFrequency as RentFrequency] ?? 12;
      return sum + Math.round((t.rentPence * perYear) / 12);
    }, 0);
}

/** A property is Occupied if it has any ACTIVE tenancy, else Vacant. */
export function occupancyOf(tenancies: { status: string }[]): OccupancyStatus {
  return tenancies.some((t) => t.status === TenancyStatus.ACTIVE)
    ? "Occupied"
    : "Vacant";
}

/**
 * Whether a date falls within a tax-year window. `end` is the 5 Apr midnight
 * from taxYearEndDate; we treat the whole of 5 Apr as in-window (so timestamped
 * transactions on the last day aren't dropped) by using an exclusive next-day bound.
 */
export function inTaxYearWindow(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t < end.getTime() + 86_400_000;
}

// ---------------------------------------------------------------------------
// Property-detail header metrics — derived, never stored (rent/valuation/
// mortgage balance each mutate independently). Pure so the maths is testable
// without prisma.
// ---------------------------------------------------------------------------

export interface PropertyHeaderMetrics {
  monthlyRentPence: number;
  annualRentPence: number;
  annualYieldBp: number | null;
  mortgageBalancePence: number;
  latestValuationPence: number | null;
  purchasePricePence: number | null;
  ltvBp: number | null;
}

/**
 * Header figures for the property detail page. `valuations` is newest-first; the
 * latest valuation wins, falling back to the denormalised `currentValuePence`.
 * Yield and LTV are basis points (null when there's no valuation to divide by).
 */
export function computePropertyHeaderMetrics(input: {
  tenancies: { status: string; rentPence: number; rentFrequency: string }[];
  mortgages: { balancePence: number }[];
  valuations: { amountPence: number }[];
  currentValuePence?: number | null;
  purchasePricePence?: number | null;
}): PropertyHeaderMetrics {
  const monthlyRentPence = normaliseMonthlyRentPence(input.tenancies);
  const annualRentPence = monthlyRentPence * 12;
  const mortgageBalancePence = input.mortgages.reduce(
    (s, m) => s + m.balancePence,
    0,
  );
  const latestValuationPence =
    input.valuations[0]?.amountPence ?? input.currentValuePence ?? null;
  return {
    monthlyRentPence,
    annualRentPence,
    annualYieldBp: annualYieldBp(annualRentPence, latestValuationPence),
    mortgageBalancePence,
    latestValuationPence,
    purchasePricePence: input.purchasePricePence ?? null,
    ltvBp: loanToValueBp(mortgageBalancePence, latestValuationPence),
  };
}

// ---------------------------------------------------------------------------
// EPC band — A (most efficient) .. G (least). Mapped onto the design tokens
// (success / warning / danger) used by Badge + Progress.
// ---------------------------------------------------------------------------

export type EpcTone = "success" | "warning" | "danger" | "neutral";

/** Tone for an EPC rating: A/B green, C/D amber, E/F/G red, unknown neutral. */
export function epcBandTone(rating: string | null | undefined): EpcTone {
  if (!rating) return "neutral";
  const r = rating.trim().toUpperCase();
  if (r === "A" || r === "B") return "success";
  if (r === "C" || r === "D") return "warning";
  if (r === "E" || r === "F" || r === "G") return "danger";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Street-view / static-map — the camera position is editable + persisted as
// JSON. A real map image is only built when a maps key is configured; without
// one the UI shows a styled placeholder.
// ---------------------------------------------------------------------------

export interface CameraPosition {
  lat: number;
  lng: number;
  heading?: number;
  pitch?: number;
  zoom?: number;
}

/** Safely coerce the `streetViewCameraPosition` JSON column to a CameraPosition. */
export function parseCameraPosition(json: unknown): CameraPosition | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;
  const lat = num(o.lat);
  const lng = num(o.lng);
  if (lat === undefined || lng === undefined) return null;
  return {
    lat,
    lng,
    heading: num(o.heading),
    pitch: num(o.pitch),
    zoom: num(o.zoom),
  };
}

/**
 * Build a Google Static Maps URL for a camera position. Returns null when no
 * key is configured or the position is incomplete — the caller renders a
 * placeholder in that case (so CI/demo never depends on a maps key).
 */
export function buildStaticMapUrl(
  position: CameraPosition | null | undefined,
  key: string | null | undefined,
): string | null {
  if (!position || !key) return null;
  if (
    typeof position.lat !== "number" ||
    typeof position.lng !== "number" ||
    !Number.isFinite(position.lat) ||
    !Number.isFinite(position.lng)
  ) {
    return null;
  }
  // Treat a missing/zero zoom as the street-level default (16) — `?? 16` alone
  // would keep a spurious 0 (a world-level map).
  const zoom =
    position.zoom && position.zoom > 0 ? Math.round(position.zoom) : 16;
  const params = new URLSearchParams({
    center: `${position.lat},${position.lng}`,
    zoom: String(zoom),
    size: "640x320",
    scale: "2",
    maptype: "roadmap",
    markers: `color:0x2a7d4a|${position.lat},${position.lng}`,
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
