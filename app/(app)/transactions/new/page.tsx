import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { createTransactionAction } from "@/actions/transaction";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Sa105CategoryLabel,
} from "@/lib/sa105";

export default async function NewTransactionPage() {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_TRANSACTIONS)) {
    return <Forbidden backHref="/transactions" message="You don't have permission to add transactions." />;
  }
  const entityId = ctx.entityId;

  const properties = await prisma.property.findMany({
    where: { landlordEntityId: entityId, archivedAt: null },
    select: { id: true, addressLine1: true },
    orderBy: { addressLine1: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to transactions
      </Link>
      <PageHeader
        title="Add a transaction"
        description="Record rent received or an expense, categorised for tax."
      />

      <Card>
        <CardContent className="pt-5">
          <form action={createTransactionAction} className="space-y-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" name="category" required defaultValue="">
                <option value="" disabled>
                  Choose a category…
                </option>
                <optgroup label="Income">
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {Sa105CategoryLabel[c]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Expenses">
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {Sa105CategoryLabel[c]}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="amount">Amount (£)</Label>
                <Input id="amount" name="amount" placeholder="1250.00" required />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="propertyId">Property (optional)</Label>
                <Select id="propertyId" name="propertyId" defaultValue="">
                  <option value="">No specific property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.addressLine1}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="merchant">Merchant / payee (optional)</Label>
                <Input id="merchant" name="merchant" />
              </div>
            </div>

            <DisclaimerBanner text="Categories map to SA105 boxes and feed your tax estimate — which is not tax advice." />

            <div className="flex gap-2 pt-1">
              <Button type="submit">Save transaction</Button>
              <Link href="/transactions">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
