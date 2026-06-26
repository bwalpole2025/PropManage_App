import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { PropertyTransactionsTable } from "@/components/properties/property-transactions-table";

export default async function PropertyTransactionsPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { entityId } = await getActiveContext();

  const property = await prisma.property.findFirst({
    where: { id: propertyId, accountId: entityId, archivedAt: undefined },
    select: { id: true },
  });
  if (!property) notFound();

  const transactions = await prisma.transaction.findMany({
    where: { propertyId, accountId: entityId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing the latest {transactions.length} transactions for this property.
        </p>
        <Link
          href="/transactions/new"
          className="text-sm font-medium text-primary hover:underline"
        >
          Add transaction →
        </Link>
      </div>

      <PropertyTransactionsTable transactions={transactions} />
    </div>
  );
}
