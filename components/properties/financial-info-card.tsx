import Link from "next/link";
import { Landmark } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CurrencyValue } from "@/components/shared/currency-value";
import { formatBpPercent } from "@/lib/finance";
import { MortgageProductLabel, type MortgageProduct } from "@/lib/enums";

export interface FinancialInfoMortgage {
  lender: string;
  productType: string;
  balancePence: number;
  monthlyPaymentPence: number;
  interestRateBp: number;
}

/** Headline mortgage facts (lender / payment / interest) + a link to the tab. */
export function FinancialInfoCard({
  mortgage,
  propertyId,
}: {
  mortgage: FinancialInfoMortgage | null;
  propertyId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Financial information</CardTitle>
        <Landmark className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {mortgage ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lender
                </dt>
                <dd className="mt-1 text-sm font-semibold">{mortgage.lender}</dd>
                <p className="text-xs text-muted-foreground">
                  {MortgageProductLabel[mortgage.productType as MortgageProduct] ??
                    mortgage.productType}
                </p>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Monthly payment
                </dt>
                <dd className="mt-1">
                  <CurrencyValue
                    pence={mortgage.monthlyPaymentPence}
                    className="text-sm font-semibold"
                  />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Interest rate
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums">
                  {formatBpPercent(mortgage.interestRateBp)}
                </dd>
              </div>
            </dl>
            <Link
              href={`/properties/${propertyId}/mortgages`}
              className="mt-4 inline-block border-t border-border pt-3 text-sm font-medium text-primary hover:underline"
            >
              View details →
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No mortgage recorded for this property.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
