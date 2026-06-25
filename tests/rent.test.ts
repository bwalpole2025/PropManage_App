import { describe, it, expect } from "vitest";
import { nextDueDate } from "@/lib/rent";
import { formatDateOrdinal } from "@/lib/format";
import { RentFrequency } from "@/lib/enums";

const ymd = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

describe("nextDueDate", () => {
  const monthly = (rentDueDay: number | null, startDate: Date) => ({
    rentDueDay,
    rentFrequency: RentFrequency.MONTHLY,
    startDate,
    nextPaymentDate: null as Date | null,
  });

  it("monthly: returns this month when today is on/before the due day", () => {
    const d = nextDueDate(monthly(3, new Date(2023, 0, 3)), new Date(2026, 6, 1)); // 1 Jul
    expect(ymd(d)).toBe("2026-7-3"); // 3 Jul
  });

  it("monthly: rolls to next month when today is past the due day", () => {
    // James: due day 3, today 25 Jun → 3 Jul
    expect(ymd(nextDueDate(monthly(3, new Date(2023, 0, 3)), new Date(2026, 5, 25)))).toBe(
      "2026-7-3",
    );
    // Maria: due day 1, today 25 Jun → 1 Jul
    expect(ymd(nextDueDate(monthly(1, new Date(2024, 5, 1)), new Date(2026, 5, 25)))).toBe(
      "2026-7-1",
    );
  });

  it("prefers a future nextPaymentDate over the computed date", () => {
    const t = {
      rentDueDay: 6,
      rentFrequency: RentFrequency.MONTHLY,
      startDate: new Date(2026, 3, 6),
      nextPaymentDate: new Date(2026, 6, 6), // 6 Jul
    };
    expect(ymd(nextDueDate(t, new Date(2026, 5, 25)))).toBe("2026-7-6");
  });

  it("ignores a PAST nextPaymentDate and falls back to rentDueDay", () => {
    const t = {
      rentDueDay: 10,
      rentFrequency: RentFrequency.MONTHLY,
      startDate: new Date(2024, 0, 10),
      nextPaymentDate: new Date(2026, 4, 10), // 10 May — in the past
    };
    expect(ymd(nextDueDate(t, new Date(2026, 5, 25)))).toBe("2026-7-10"); // 10 Jul
  });

  it("clamps the due day to the month length", () => {
    // due day 31, next due falls in Sep (30 days) → 30 Sep
    const d = nextDueDate(monthly(31, new Date(2024, 0, 31)), new Date(2026, 8, 15));
    expect(ymd(d)).toBe("2026-9-30");
  });

  it("weekly: advances by 7 days from startDate to the first date ≥ today", () => {
    const t = {
      rentDueDay: null,
      rentFrequency: RentFrequency.WEEKLY,
      startDate: new Date(2026, 5, 1), // 1 Jun (Mon)
      nextPaymentDate: null,
    };
    // 1,8,15,22,29 Jun … today 25 Jun → 29 Jun
    expect(ymd(nextDueDate(t, new Date(2026, 5, 25)))).toBe("2026-6-29");
  });

  it("quarterly: advances 3 months at a time", () => {
    const t = {
      rentDueDay: 1,
      rentFrequency: RentFrequency.QUARTERLY,
      startDate: new Date(2025, 0, 1), // 1 Jan 2025 → Apr, Jul, Oct, Jan…
      nextPaymentDate: null,
    };
    // today 25 Jun 2026 → next quarter date 1 Jul 2026
    expect(ymd(nextDueDate(t, new Date(2026, 5, 25)))).toBe("2026-7-1");
  });
});

describe("formatDateOrdinal", () => {
  const jul = (day: number) => formatDateOrdinal(new Date(2026, 6, day));
  it("applies the correct ordinal suffix", () => {
    expect(jul(1)).toBe("1st Jul");
    expect(jul(2)).toBe("2nd Jul");
    expect(jul(3)).toBe("3rd Jul");
    expect(jul(4)).toBe("4th Jul");
    expect(jul(11)).toBe("11th Jul");
    expect(jul(12)).toBe("12th Jul");
    expect(jul(13)).toBe("13th Jul");
    expect(jul(21)).toBe("21st Jul");
    expect(jul(22)).toBe("22nd Jul");
    expect(jul(23)).toBe("23rd Jul");
  });
});
