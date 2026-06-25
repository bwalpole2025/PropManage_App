import { describe, it, expect } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("parses simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields with commas, newlines and escaped quotes", () => {
    const text = 'name,note\r\n"Smith, J","line1\nline2"\r\n"He said ""hi""",ok';
    expect(parseCsv(text)).toEqual([
      ["name", "note"],
      ["Smith, J", "line1\nline2"],
      ['He said "hi"', "ok"],
    ]);
  });

  it("tolerates a trailing newline and a BOM", () => {
    expect(parseCsv("﻿a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps empty cells", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});

describe("toCsv", () => {
  it("quotes only cells that need it and doubles internal quotes", () => {
    const csv = toCsv([
      ["Date", "Description", "Amount"],
      ["2026-06-01", "Rent, June", 1250],
      ["2026-06-02", 'Said "hi"', 50],
    ]);
    expect(csv).toBe(
      'Date,Description,Amount\r\n2026-06-01,"Rent, June",1250\r\n2026-06-02,"Said ""hi""",50',
    );
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["a", "b,c", 'd"e'],
      ["with\nnewline", "plain", ""],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows.map((r) => r.map(String)));
  });
});
