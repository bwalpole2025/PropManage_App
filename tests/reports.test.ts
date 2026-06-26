import { describe, it, expect } from "vitest";
import { parseReportFilters, resolvePeriod, toISODate } from "@/lib/reports/filters";
import { reportToCsv } from "@/lib/reports/csv";
import { reportToPdf } from "@/lib/reports/pdf";
import {
  bucketByMonth,
  groupByCategory,
  sumIn,
  sumOut,
} from "@/lib/reports/aggregate";
import type { ReportDocument } from "@/lib/reports/types";

const NOW = new Date(Date.UTC(2026, 5, 26)); // 26 Jun 2026 (tax year 2026-27)

describe("report filters", () => {
  it("resolves the current tax year window (6 Apr – 5 Apr)", () => {
    const p = resolvePeriod("this-tax-year", undefined, undefined, NOW);
    expect(toISODate(p.from!)).toBe("2026-04-06");
    expect(toISODate(p.to!)).toBe("2027-04-05");
  });

  it("resolves a custom range as inclusive start/end of day", () => {
    const p = resolvePeriod("custom", "2025-01-01", "2025-03-31", NOW);
    expect(toISODate(p.from!)).toBe("2025-01-01");
    expect(toISODate(p.to!)).toBe("2025-03-31");
    expect(p.to!.getUTCHours()).toBe(23);
  });

  it("resolves 'all' as an open window", () => {
    const p = resolvePeriod("all", undefined, undefined, NOW);
    expect(p.from).toBeNull();
    expect(p.to).toBeNull();
    expect(p.label).toBe("All time");
  });

  it("defaults to this-tax-year and parses portfolio/tax-year params", () => {
    const f = parseReportFilters({ portfolioId: "p1", ty: "2024-25" }, NOW);
    expect(f.period.preset).toBe("this-tax-year");
    expect(f.portfolioId).toBe("p1");
    expect(f.taxYear).toBe("2024-25");
    // A malformed tax-year string is rejected.
    expect(parseReportFilters({ ty: "nope" }, NOW).taxYear).toBeUndefined();
  });
});

describe("aggregate helpers", () => {
  const txns = [
    { direction: "INCOME", amountPence: 1000, category: "RENT_INCOME", date: new Date(Date.UTC(2025, 0, 5)) },
    { direction: "INCOME", amountPence: 500, category: "RENT_INCOME", date: new Date(Date.UTC(2025, 1, 5)) },
    { direction: "EXPENSE", amountPence: 300, category: "INSURANCE", date: new Date(Date.UTC(2025, 0, 20)) },
  ];

  it("sums money in and out by direction", () => {
    expect(sumIn(txns)).toBe(1500);
    expect(sumOut(txns)).toBe(300);
  });

  it("groups by category, sorted by amount desc", () => {
    const groups = groupByCategory(txns);
    expect(groups[0].label).toBe("Rent received");
    expect(groups[0].amountPence).toBe(1500);
    expect(groups[0].count).toBe(2);
  });

  it("buckets into calendar months, oldest first", () => {
    const buckets = bucketByMonth(txns, (t) => t.date);
    expect(buckets.map((b) => b.key)).toEqual(["2025-01", "2025-02"]);
    expect(buckets[0].items).toHaveLength(2);
  });
});

const SAMPLE: ReportDocument = {
  slug: "sample",
  title: "Sample Report £",
  subtitle: "Acme · Individual",
  meta: ["Period: 6 Apr 2024 – 5 Apr 2025"],
  sections: [
    {
      title: "Summary",
      summary: [{ label: "Net", pence: -4321_00, emphasis: true, tone: "auto" }],
    },
    {
      title: "Lines",
      tables: [
        {
          columns: [
            { key: "name", label: "Name" },
            { key: "amt", label: "Amount", type: "currency" },
          ],
          // A name that looks like a spreadsheet formula must be neutralised.
          rows: [{ name: "=SUM(A1:A2)", amt: 250000 }],
          totals: { name: "Total", amt: 250000 },
        },
      ],
    },
  ],
  disclaimer: "Test only.",
};

describe("report CSV", () => {
  const csv = reportToCsv(SAMPLE);

  it("neutralises formula injection but keeps numbers numeric", () => {
    expect(csv).toContain("'=SUM(A1:A2)");
    expect(csv).toContain("-4321.00"); // negative currency stays a plain number
    expect(csv).toContain("2500.00");
  });

  it("includes titles and disclaimer", () => {
    expect(csv).toContain("Sample Report");
    expect(csv).toContain("Test only.");
  });
});

describe("report PDF", () => {
  it("produces a structurally valid PDF", () => {
    const bytes = reportToPdf(SAMPLE);
    const text = Buffer.from(bytes).toString("latin1");
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text.includes("\nxref\n")).toBe(true);
    expect(text.includes("/Root 1 0 R")).toBe(true);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("handles an empty document without throwing", () => {
    const empty: ReportDocument = { slug: "e", title: "Empty", sections: [] };
    const bytes = reportToPdf(empty);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });

  it("paginates large tables across multiple pages", () => {
    const big: ReportDocument = {
      slug: "big",
      title: "Big",
      sections: [
        {
          title: "Rows",
          tables: [
            {
              columns: [
                { key: "i", label: "Index", type: "number" },
                { key: "v", label: "Value", type: "currency" },
              ],
              rows: Array.from({ length: 120 }, (_, i) => ({ i, v: i * 100 })),
            },
          ],
        },
      ],
    };
    const text = Buffer.from(reportToPdf(big)).toString("latin1");
    const count = (text.match(/\/Count (\d+)/)?.[1]) ?? "0";
    expect(Number(count)).toBeGreaterThan(1);
  });
});
