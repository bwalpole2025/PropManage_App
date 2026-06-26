import { describe, it, expect } from "vitest";
import { evaluateArrears, DAY_MS } from "@/lib/arrears";
import { RentStatus } from "@/lib/enums";

const NOW = new Date("2026-06-26T00:00:00Z");
const past = (days: number) => new Date(NOW.getTime() - days * DAY_MS);
const future = (days: number) => new Date(NOW.getTime() + days * DAY_MS);

const RENT = 125_000; // £1,250

describe("evaluateArrears (rent arrears detection)", () => {
  it("flags a fully-unpaid past-due period as OVERDUE with full shortfall", () => {
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: 0, dueDate: past(10) },
      NOW,
    );
    expect(a.overdue).toBe(true);
    expect(a.status).toBe(RentStatus.OVERDUE);
    expect(a.shortfallPence).toBe(RENT);
    expect(a.daysOverdue).toBe(10);
    expect(a.fullyPaid).toBe(false);
  });

  it("flags a partly-paid past-due period as PARTIAL with the remaining shortfall", () => {
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: 50_000, dueDate: past(3) },
      NOW,
    );
    expect(a.overdue).toBe(true);
    expect(a.status).toBe(RentStatus.PARTIAL);
    expect(a.shortfallPence).toBe(RENT - 50_000);
    expect(a.daysOverdue).toBe(3);
  });

  it("does not flag a fully-paid period, even past due (status PAID)", () => {
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: RENT, dueDate: past(30) },
      NOW,
    );
    expect(a.overdue).toBe(false);
    expect(a.fullyPaid).toBe(true);
    expect(a.status).toBe(RentStatus.PAID);
    expect(a.shortfallPence).toBe(0);
    expect(a.daysOverdue).toBe(0);
  });

  it("treats an overpayment as fully paid", () => {
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: RENT + 5_000, dueDate: past(1) },
      NOW,
    );
    expect(a.overdue).toBe(false);
    expect(a.fullyPaid).toBe(true);
    expect(a.status).toBe(RentStatus.PAID);
  });

  it("does not flag an unpaid period that is not yet due (status DUE)", () => {
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: 0, dueDate: future(5) },
      NOW,
    );
    expect(a.overdue).toBe(false);
    expect(a.status).toBe(RentStatus.DUE);
    expect(a.shortfallPence).toBe(0);
    expect(a.daysOverdue).toBe(0);
  });

  it("is not overdue exactly at the due moment (strictly past due only)", () => {
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: 0, dueDate: NOW },
      NOW,
    );
    expect(a.overdue).toBe(false);
    expect(a.status).toBe(RentStatus.DUE);
  });

  it("counts whole days overdue, flooring partial days", () => {
    const dueDate = new Date(NOW.getTime() - (2 * DAY_MS + 60_000)); // 2 days + 1 min
    const a = evaluateArrears(
      { expectedPence: RENT, receivedPence: 0, dueDate },
      NOW,
    );
    expect(a.daysOverdue).toBe(2);
  });
});
