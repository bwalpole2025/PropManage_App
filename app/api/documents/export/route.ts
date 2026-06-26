import { NextResponse } from "next/server";
import { getActiveContext } from "@/lib/auth/active-org";
import { listDocumentsForExport } from "@/services/documents";
import { resolveDocumentCategoryLabel } from "@/lib/enums";
import { daysUntil } from "@/lib/format";
import { toCsv } from "@/lib/csv";

// Entity-scoped CSV export of all documents with their expiry status.
export async function GET() {
  let entityId: string;
  try {
    ({ entityId } = await getActiveContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { docs, names } = await listDocumentsForExport(entityId);

  const rows: (string | number)[][] = [
    ["Category", "Property", "Reference", "File", "Issued", "Expires", "Status"],
    ...docs.map((d) => {
      const status = !d.expiryDate
        ? ""
        : daysUntil(d.expiryDate) < 0
          ? "Expired"
          : `${daysUntil(d.expiryDate)} days left`;
      return [
        resolveDocumentCategoryLabel(d.category, names),
        d.property?.addressLine1 ?? "",
        d.reference ?? "",
        d.file?.filename ?? "",
        d.issuedDate?.toISOString().slice(0, 10) ?? "",
        d.expiryDate?.toISOString().slice(0, 10) ?? "",
        status,
      ];
    }),
  ];

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="documents.csv"',
    },
  });
}
