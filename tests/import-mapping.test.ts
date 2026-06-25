import { describe, it, expect } from "vitest";
import {
  detectMapping,
  dedupKey,
  parseImportDate,
  summarise,
  toRawRow,
  validateRow,
  type ColumnMapping,
  type ValidateContext,
} from "@/lib/import-mapping";
import { Sa105Category } from "@/lib/sa105";
import { TxnDirection } from "@/lib/enums";

const ctx: ValidateContext = {
  properties: [{ id: "p1", addressLine1: "12 Oak Street" }],
  tenancies: [{ id: "t1", label: "James Smith · 12 Oak Street" }],
};
const MAP: ColumnMapping = { date: 0, description: 1, amount: 2, category: 3, property: 4 };
const raw = (cells: string[]) => toRawRow(cells, MAP, 2);

describe("detectMapping", () => {
  it("auto-maps by header aliases", () => {
    const m = detectMapping(["Date", "Narrative", "Value", "Category", "Address"]);
    expect(m.date).toBe(0);
    expect(m.description).toBe(1);
    expect(m.amount).toBe(2);
    expect(m.category).toBe(3);
    expect(m.property).toBe(4);
  });
});

describe("validateRow", () => {
  it("accepts a valid income row and resolves property/category", () => {
    const r = validateRow(
      raw(["2026-04-06", "Rent April", "1250", "RENT_INCOME", "12 Oak Street"]),
      ctx,
    );
    expect(r.ok).toBe(true);
    expect(r.value?.amountPence).toBe(125000);
    expect(r.value?.category).toBe(Sa105Category.RENT_INCOME);
    expect(r.value?.propertyId).toBe("p1");
    expect(r.value?.direction).toBe(TxnDirection.INCOME);
  });

  it("derives expense direction from a negative amount", () => {
    const r = validateRow(raw(["2026-04-06", "British Gas", "-85.40", "", ""]), ctx);
    expect(r.ok).toBe(true);
    expect(r.value?.direction).toBe(TxnDirection.EXPENSE);
    expect(r.value?.amountPence).toBe(8540);
  });

  it("reports field-level errors", () => {
    expect(
      validateRow(raw(["not-a-date", "X", "10", "", ""]), ctx).errors.some(
        (e) => e.field === "date",
      ),
    ).toBe(true);
    expect(
      validateRow(raw(["2026-04-06", "X", "abc", "", ""]), ctx).errors.some(
        (e) => e.field === "amount",
      ),
    ).toBe(true);
    expect(
      validateRow(raw(["2026-04-06", "X", "10", "NONSENSE", ""]), ctx).errors.some(
        (e) => e.field === "category",
      ),
    ).toBe(true);
    expect(
      validateRow(raw(["2026-04-06", "X", "10", "", "99 Nowhere"]), ctx).errors.some(
        (e) => e.field === "property",
      ),
    ).toBe(true);
  });
});

describe("parseImportDate (UK-aware, UTC)", () => {
  it("parses ISO YYYY-MM-DD at UTC midnight", () => {
    const d = parseImportDate("2026-04-06")!;
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(3);
    expect(d.getUTCDate()).toBe(6);
  });
  it("parses UK DD/MM/YYYY as day-first (not US month-first)", () => {
    const d = parseImportDate("13/04/2026")!; // 13 April — invalid as US M/D
    expect(d.getUTCMonth()).toBe(3);
    expect(d.getUTCDate()).toBe(13);
  });
  it("rejects impossible and unparseable dates", () => {
    expect(parseImportDate("31/02/2026")).toBeNull();
    expect(parseImportDate("notadate")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });
});

describe("amount validation tightening", () => {
  const m: ColumnMapping = { date: 0, description: 1, amount: 2 };
  const check = (amount: string) =>
    validateRow(toRawRow(["2026-04-06", "X", amount], m, 2), ctx);
  it("accepts well-formed amounts", () => {
    expect(check("1,250.50").value?.amountPence).toBe(125050);
    expect(check("-85.40").value?.amountPence).toBe(8540);
    expect(check("£1250").value?.amountPence).toBe(125000);
  });
  it("rejects malformed amounts", () => {
    expect(check("1,2,3").ok).toBe(false);
    expect(check("5.").ok).toBe(false);
    expect(check("abc").ok).toBe(false);
  });
});

describe("dedup + summarise", () => {
  it("dedupKey is stable, case-insensitive, and property-scoped", () => {
    const a = dedupKey({ date: new Date("2026-04-06"), amountPence: 125000, description: "Rent", propertyId: "p1" });
    const b = dedupKey({ date: "2026-04-06", amountPence: 125000, description: "rent", propertyId: "p1" });
    expect(a).toBe(b);
    expect(
      dedupKey({ date: "2026-04-06", amountPence: 125000, description: "Rent", propertyId: "p2" }),
    ).not.toBe(a);
  });

  it("counts valid / error / in-batch-duplicate rows", () => {
    const m: ColumnMapping = { date: 0, description: 1, amount: 2 };
    const rows = [
      ["2026-04-06", "Rent", "1250"],
      ["2026-04-06", "Rent", "1250"],
      ["bad", "X", "abc"],
    ].map((c, i) => toRawRow(c, m, i + 2));
    const s = summarise(rows.map((r) => validateRow(r, ctx)));
    expect(s.valid).toBe(1);
    expect(s.duplicateCount).toBe(1);
    expect(s.errorCount).toBe(1);
  });
});
