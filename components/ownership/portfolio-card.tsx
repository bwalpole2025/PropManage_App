import { Briefcase, Building2, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PortfolioType, PortfolioTypeLabel } from "@/lib/enums";

export interface PortfolioCardData {
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  propertyCount: number;
  ownerCount: number;
}

/** A portfolio summary card: type, property count, beneficial-owner count. */
export function PortfolioCard({ portfolio }: { portfolio: PortfolioCardData }) {
  const isBusiness = portfolio.type === PortfolioType.BUSINESS;
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Briefcase className="h-4 w-4" />
            </span>
            <h3 className="truncate font-semibold">{portfolio.name}</h3>
          </div>
          <Badge tone={isBusiness ? "primary" : "neutral"}>
            {PortfolioTypeLabel[portfolio.type as PortfolioType] ?? portfolio.type}
          </Badge>
        </div>

        <div className="flex gap-6 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="font-semibold text-foreground tabular-nums">
              {portfolio.propertyCount}
            </span>{" "}
            {portfolio.propertyCount === 1 ? "property" : "properties"}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Users2 className="h-4 w-4" />
            <span className="font-semibold text-foreground tabular-nums">
              {portfolio.ownerCount}
            </span>{" "}
            {portfolio.ownerCount === 1 ? "owner" : "owners"}
          </span>
        </div>

        {portfolio.isDefault ? (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Default portfolio — transactions tracked without a property are
            counted here, and aren&apos;t split between beneficial owners.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
