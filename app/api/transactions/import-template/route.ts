import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";

const HEADER = ["Date", "Description", "Amount", "Category", "Property", "Tenancy", "Notes"];
const EXAMPLES: (string | number)[][] = [
  ["2026-04-06", "Rent received - April", "1250", "RENT_INCOME", "", "", "Monthly rent"],
  ["2026-04-10", "British Gas", "-85.40", "UTILITIES", "", "", "Gas bill"],
  ["2026-04-15", "Plumber - leak fix", "-220", "REPAIRS_MAINTENANCE", "", "", ""],
];

// Downloadable import template. Use YYYY-MM-DD dates and negative amounts for
// expenses (or a Category column, which sets direction).
export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") ?? "csv";

  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet([HEADER, ...EXAMPLES]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="import-template.xlsx"',
      },
    });
  }

  return new NextResponse(toCsv([HEADER, ...EXAMPLES]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="import-template.csv"',
    },
  });
}
