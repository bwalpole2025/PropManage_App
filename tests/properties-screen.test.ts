import { describe, it, expect } from "vitest";
import {
  inTaxYearWindow,
  normaliseMonthlyRentPence,
  occupancyOf,
} from "@/lib/property-finance";
import { formatBpPercent, loanToValueBp } from "@/lib/finance";
import { taxYearEndDate, taxYearStartDate } from "@/lib/format";

describe("property-finance helpers", () => {
  it("normalises ACTIVE rent to a monthly figure across frequencies", () => {
    const t = [
      { status: "ACTIVE", rentPence: 50000, rentFrequency: "MONTHLY" },
      { status: "ACTIVE", rentPence: 12000, rentFrequency: "WEEKLY" }, // 12000*52/12 = 52000
      { status: "ENDED", rentPence: 99999, rentFrequency: "MONTHLY" }, // ignored
    ];
    expect(normaliseMonthlyRentPence(t)).toBe(50000 + 52000);
  });

  it("occupancy is Occupied iff an ACTIVE tenancy exists", () => {
    expect(occupancyOf([{ status: "ENDED" }, { status: "ACTIVE" }])).toBe("Occupied");
    expect(occupancyOf([{ status: "ENDED" }])).toBe("Vacant");
    expect(occupancyOf([])).toBe("Vacant");
  });

  it("tax-year window is 6 Apr to 5 Apr inclusive", () => {
    const start = taxYearStartDate("2025-26");
    const end = taxYearEndDate("2025-26");
    expect(inTaxYearWindow(new Date(Date.UTC(2025, 3, 6)), start, end)).toBe(true);
    expect(inTaxYearWindow(new Date(Date.UTC(2026, 3, 5)), start, end)).toBe(true);
    // A timestamped transaction on the LAST day (5 Apr) must still be in-window.
    expect(inTaxYearWindow(new Date(Date.UTC(2026, 3, 5, 14, 30)), start, end)).toBe(true);
    expect(inTaxYearWindow(new Date(Date.UTC(2025, 3, 5)), start, end)).toBe(false);
    expect(inTaxYearWindow(new Date(Date.UTC(2026, 3, 6)), start, end)).toBe(false);
  });

  it("LTV = balance / value (seed mortgage = 57.35%)", () => {
    expect(loanToValueBp(19_500_000, 34_000_000)).toBe(5735);
    expect(formatBpPercent(5735)).toBe("57.35%");
    expect(loanToValueBp(100, 0)).toBeNull();
  });
});
