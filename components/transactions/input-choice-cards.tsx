import { Landmark, FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectBankFeedButton } from "./connect-bank-feed-button";
import { ImportTransactionsButton } from "./import-dialog";

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {items.map((b) => (
        <li key={b} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

/** Empty-state for an account with no transactions: choose how to get data in. */
export function InputChoiceCards({ canManage }: { canManage: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </span>
          <CardTitle className="mt-2">Bank feeds</CardTitle>
          <CardDescription>
            Connect your account for live, automatic data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Bullets
            items={[
              "Real-time payment notifications",
              "Missing rental payment alerts",
              "Arrears management",
            ]}
          />
          {canManage ? (
            <ConnectBankFeedButton label="Connect a bank feed" variant="primary" />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <FileSpreadsheet className="h-5 w-5" />
          </span>
          <CardTitle className="mt-2">Spreadsheet uploads</CardTitle>
          <CardDescription>
            Bring your existing records across in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Bullets
            items={[
              "Rental income & expense history",
              "Attach receipts to transactions",
              "One-off CSV import",
            ]}
          />
          {canManage ? (
            <ImportTransactionsButton
              label="Upload spreadsheets"
              variant="secondary"
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
