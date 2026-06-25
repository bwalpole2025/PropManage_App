import { NextResponse } from "next/server";
import { getActiveContext } from "@/lib/auth/active-org";
import {
  listTransactions,
  parseTransactionFilters,
} from "@/services/transactions";
import { Sa105CategoryLabel } from "@/lib/sa105";
import { toCsv } from "@/lib/csv";

// Entity-scoped CSV export of the filtered ledger. Honours the same query params
// as the Transactions page via parseTransactionFilters.
export async function GET(req: Request) {
  let entityId: string;
  try {
    ({ entityId } = await getActiveContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = Object.fromEntries(new URL(req.url).searchParams.entries());
  const { transactions } = await listTransactions(
    entityId,
    parseTransactionFilters(sp),
  );

  const rows: (string | number)[][] = [
    ["Date", "Description", "Property", "Tenant", "Category", "Direction", "Amount (£)", "Status"],
    ...transactions.map((t) => {
      const signed = t.direction === "EXPENSE" ? -t.amountPence : t.amountPence;
      return [
        t.date.toISOString().slice(0, 10),
        t.description,
        t.property?.addressLine1 ?? "",
        t.tenancy?.tenants[0]?.name ?? "",
        t.category
          ? (Sa105CategoryLabel[t.category as keyof typeof Sa105CategoryLabel] ??
            t.category)
          : "",
        t.direction,
        (signed / 100).toFixed(2),
        t.status,
      ];
    }),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
