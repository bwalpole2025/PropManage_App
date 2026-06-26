import { notFound } from "next/navigation";
import Link from "next/link";
import { Archive, FileText } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getPropertyDetail, listPortfolios } from "@/services/properties";
import { can, Capability } from "@/lib/auth/rbac";
import { StatTile } from "@/components/shared/stat-tile";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StreetViewCard } from "@/components/properties/street-view-card";
import { EditPropertyDialog } from "@/components/properties/edit-property-dialog";
import {
  ArchivePropertyButton,
  RestorePropertyButton,
} from "@/components/properties/archive-property-button";
import { PropertyPnl } from "@/components/properties/property-pnl";
import { FinancialInfoCard } from "@/components/properties/financial-info-card";
import { TenantsSummary } from "@/components/properties/tenants-summary";
import { TaxYearAnalysis } from "@/components/properties/tax-year-analysis";
import { PropertyNotes } from "@/components/properties/property-notes";
import { PropertyTransactionsTable } from "@/components/properties/property-transactions-table";
import { AddComplianceForm } from "@/components/properties/add-compliance-form";
import { formatBpPercent } from "@/lib/finance";
import { formatPence, formatDate } from "@/lib/format";
import { DocumentCategoryLabel } from "@/lib/enums";

export default async function PropertyInfoPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const ctx = await getActiveContext();
  const detail = await getPropertyDetail(ctx.entityId, propertyId);
  if (!detail) notFound();

  const canManage = can(ctx.role, Capability.MANAGE_PROPERTIES);
  const portfolios = canManage ? await listPortfolios(ctx.entityId) : [];

  const {
    property,
    header,
    pnl12m,
    perTaxYear,
    recentTxns,
    hasTransactions,
    taxYearLabel,
  } = detail;
  const archived = Boolean(property.archivedAt);

  const address = [
    property.addressLine1,
    property.addressLine2,
    property.city,
    property.postcode,
  ]
    .filter(Boolean)
    .join(", ");
  const firstMortgage = property.mortgages[0] ?? null;
  const money0 = (p: number | null) =>
    p != null ? formatPence(p, { showPence: false }) : "—";

  return (
    <div className="space-y-6">
      {archived ? (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="flex items-center gap-2 text-sm">
              <Archive className="h-4 w-4 text-warning-foreground" />
              This property is archived — hidden from active lists, history
              preserved.
            </p>
            {canManage ? <RestorePropertyButton propertyId={propertyId} /> : null}
          </CardContent>
        </Card>
      ) : null}

      <StreetViewCard
        address={address}
        cameraPosition={property.streetViewCameraPosition}
        propertyId={propertyId}
        canManage={canManage && !archived}
      />

      {canManage && !archived ? (
        <div className="flex flex-wrap justify-end gap-2">
          <EditPropertyDialog
            propertyId={propertyId}
            portfolios={portfolios}
            values={{
              currentValuePence: property.currentValuePence,
              purchasePricePence: property.purchasePricePence,
              purchaseDate: property.purchaseDate,
              rentalIncomeAmountPence: property.rentalIncomeAmountPence,
              rentalIncomeFrequency: property.rentalIncomeFrequency,
              isFHL: property.isFHL,
              furnished: property.furnished,
              epcRating: property.epcRating,
              epcScore: property.epcScore,
              epcExpiryDate: property.epcExpiryDate,
              portfolioId: header.portfolioId,
            }}
          />
          <ArchivePropertyButton propertyId={propertyId} address={property.addressLine1} />
        </div>
      ) : null}

      {/* Header metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Rental income"
          value={money0(header.monthlyRentPence)}
          hint="per month"
          accent="success"
        />
        <StatTile
          label="Annual yield"
          value={formatBpPercent(header.annualYieldBp)}
          accent="success"
        />
        <StatTile label="Mortgage balance" value={money0(header.mortgageBalancePence)} />
        <StatTile label="Valuation" value={money0(header.latestValuationPence)} />
        <StatTile label="Purchase price" value={money0(header.purchasePricePence)} />
        <StatTile label="Loan to value" value={formatBpPercent(header.ltvBp)} />
        <StatTile
          label="Portfolio"
          value={header.portfolioName}
          hint={canManage && !archived ? "Edit information to change" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PropertyPnl
          pnl={pnl12m}
          taxYearLabel={taxYearLabel}
          hasTransactions={hasTransactions}
          propertyId={propertyId}
        />
        <FinancialInfoCard mortgage={firstMortgage} propertyId={propertyId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TenantsSummary
          tenancies={property.tenancies}
          propertyId={propertyId}
          canManage={canManage && !archived}
        />
        <DocumentsCard
          documents={property.documents}
          propertyId={propertyId}
          canManage={canManage && !archived}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TaxYearAnalysis title="Income analysis" rows={perTaxYear} metric="income" />
        <TaxYearAnalysis title="Expenses analysis" rows={perTaxYear} metric="expense" />
      </div>

      <PropertyNotes
        propertyId={propertyId}
        notes={property.notes}
        canManage={canManage && !archived}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <Link
            href={`/properties/${propertyId}/transactions`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Review all →
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <PropertyTransactionsTable transactions={recentTxns} />
        </CardContent>
      </Card>
    </div>
  );
}

function DocumentsCard({
  documents,
  propertyId,
  canManage,
}: {
  documents: {
    id: string;
    category: string;
    expiryDate: Date | string | null;
    reference: string | null;
  }[];
  propertyId: string;
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Documents</CardTitle>
        <FileText className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents stored.</p>
        ) : (
          <ul className="space-y-3">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {DocumentCategoryLabel[
                      d.category as keyof typeof DocumentCategoryLabel
                    ] ?? d.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.expiryDate
                      ? `Expires ${formatDate(d.expiryDate)}`
                      : "No expiry"}
                    {d.reference ? ` · ${d.reference}` : ""}
                  </p>
                </div>
                {d.expiryDate ? <ReminderBadge date={d.expiryDate} /> : null}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          {canManage ? <AddComplianceForm propertyId={propertyId} /> : null}
          <Link
            href={`/properties/${propertyId}/compliance`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Review all →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
