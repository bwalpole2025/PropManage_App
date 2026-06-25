import { FolderClock, FileText, Upload } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getFilesAndDates } from "@/services/files";
import { PageHeader } from "@/components/shared/page-header";
import { StatTile } from "@/components/shared/stat-tile";
import { EmptyState } from "@/components/shared/empty-state";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { DocumentCategoryLabel } from "@/lib/enums";

export default async function DocumentsPage() {
  const ctx = await getActiveContext();
  const { compliance, files, buckets } = await getFilesAndDates(ctx.entityId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Certificates and uploaded files across this account, soonest expiry first."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Expired"
          value={buckets.overdue}
          accent={buckets.overdue > 0 ? "danger" : "success"}
        />
        <StatTile
          label="Due ≤ 7 days"
          value={buckets.within7}
          accent={buckets.within7 > 0 ? "warning" : "neutral"}
        />
        <StatTile label="Due ≤ 14 days" value={buckets.within14} accent="neutral" />
        <StatTile label="Due ≤ 30 days" value={buckets.within30} accent="neutral" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderClock className="h-5 w-5 text-primary" /> Compliance certificates
          </CardTitle>
          <CardDescription>
            Every certificate across this account, soonest expiry first.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {compliance.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No certificates yet"
                description="Add certificates from a property's Compliance tab."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Type</TH>
                  <TH>Property</TH>
                  <TH>Reference</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {compliance.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium">
                      {DocumentCategoryLabel[
                        c.category as keyof typeof DocumentCategoryLabel
                      ] ?? c.category}
                    </TD>
                    <TD className="text-muted-foreground">
                      {c.property?.addressLine1 ?? "Portfolio-wide"}
                    </TD>
                    <TD className="text-muted-foreground">{c.reference ?? "—"}</TD>
                    <TD>{formatDate(c.expiryDate!)}</TD>
                    <TD>
                      <ReminderBadge date={c.expiryDate!} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" /> Uploaded files
          </CardTitle>
          <Badge tone="neutral">
            <Upload className="h-3 w-3" /> Upload (soon)
          </Badge>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <EmptyState
              title="No documents uploaded"
              description="Tenancy agreements, receipts and statements will live here. File upload storage is stubbed for local dev."
            />
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-3">
                  <span className="truncate text-sm font-medium">{f.filename}</span>
                  <span className="text-xs text-muted-foreground">
                    {f.property?.addressLine1 ?? "Portfolio"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
