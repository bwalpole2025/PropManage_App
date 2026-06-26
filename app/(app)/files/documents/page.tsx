import { FolderClock, Download, FileText } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { getDocumentsScreen, type DocumentRow } from "@/services/documents";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
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
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { DocumentsTabs } from "@/components/documents/documents-tabs";
import { DocumentsFilterBar } from "@/components/documents/documents-filter-bar";
import { UploadDocumentDialog } from "@/components/documents/upload-document-dialog";
import { AddCustomCategoryDialog } from "@/components/documents/add-custom-category-dialog";
import { CustomCategoriesManager } from "@/components/documents/custom-categories-manager";
import { formatDate } from "@/lib/format";
import { DocumentCategory, resolveDocumentCategoryLabel } from "@/lib/enums";

type Screen = Awaited<ReturnType<typeof getDocumentsScreen>>;

function ExpiryTiles({ buckets }: { buckets: Screen["buckets"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        label="Expired"
        value={buckets.expired}
        accent={buckets.expired > 0 ? "danger" : "success"}
      />
      <StatTile
        label="Within 2 weeks"
        value={buckets.d14}
        accent={buckets.d14 > 0 ? "warning" : "neutral"}
      />
      <StatTile label="Within 1 month" value={buckets.d30} accent="neutral" />
      <StatTile label="Within 3 months" value={buckets.d90} accent="neutral" />
    </div>
  );
}

function DocumentsTable({
  rows,
  customNames,
}: {
  rows: DocumentRow[];
  customNames: Record<string, string>;
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Category</TH>
          <TH>Property</TH>
          <TH>Tenancy</TH>
          <TH>Reference</TH>
          <TH>File</TH>
          <TH>Expires</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((d) => (
          <TR key={d.id}>
            <TD className="font-medium">
              {resolveDocumentCategoryLabel(d.category, customNames)}
            </TD>
            <TD className="text-muted-foreground">
              {d.property?.addressLine1 ?? "Portfolio-wide"}
            </TD>
            <TD className="text-muted-foreground">
              {d.tenancy?.tenants[0]?.name ?? "—"}
            </TD>
            <TD className="text-muted-foreground">{d.reference ?? "—"}</TD>
            <TD>
              {d.file ? (
                <a
                  href={`/api/files/${d.file.id}`}
                  className="text-primary hover:underline"
                >
                  {d.file.filename}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TD>
            <TD>{d.expiryDate ? formatDate(d.expiryDate) : "—"}</TD>
            <TD>
              {d.expiryDate ? (
                <ReminderBadge date={d.expiryDate} />
              ) : (
                <span className="text-xs text-muted-foreground">No expiry</span>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

function ReportsSection({ screen }: { screen: Screen }) {
  const breakdown = Object.entries(screen.countByCategory)
    .map(([cat, count]) => ({
      label: resolveDocumentCategoryLabel(cat, screen.customNames),
      count,
    }))
    .sort((a, b) => b.count - a.count);
  const total = breakdown.reduce((s, r) => s + r.count, 0);

  return (
    <div className="space-y-6">
      <ExpiryTiles buckets={screen.buckets} />
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Documents by category</CardTitle>
            <CardDescription>
              {total} document{total === 1 ? "" : "s"} across this account.
            </CardDescription>
          </div>
          <a
            href="/api/documents/export"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            <Download className="h-4 w-4" /> Download CSV
          </a>
        </CardHeader>
        <CardContent className="p-0">
          {breakdown.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Nothing to report yet"
                description="Upload documents to see a category breakdown and expiry summary."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH className="text-right">Documents</TH>
                </TR>
              </THead>
              <TBody>
                {breakdown.map((r) => (
                  <TR key={r.label}>
                    <TD className="font-medium">{r.label}</TD>
                    <TD className="text-right tabular-nums">{r.count}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const canManage = can(ctx.role, Capability.MANAGE_FILES);
  const activeTab = sp.tab ?? "documents";

  const screen = await getDocumentsScreen(ctx.entityId, {
    tab: sp.tab,
    category: sp.category,
    expiry: sp.expiry,
    propertyId: sp.propertyId,
    portfolioId: sp.portfolioId,
    tenancyId: sp.tenancyId,
  });

  const isList = activeTab === "documents" || activeTab === "receipts";
  const customForPickers = screen.customCategories.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <SectionCoachmark section="documents" />
      <PageHeader
        title="Documents"
        description="Compliance certificates, receipts and files — with expiry tracking and reminders."
        actions={
          canManage ? (
            <>
              <AddCustomCategoryDialog />
              <UploadDocumentDialog
                properties={screen.properties}
                tenancies={screen.tenancies}
                customCategories={customForPickers}
                defaultCategory={
                  activeTab === "receipts"
                    ? DocumentCategory.RECEIPT
                    : DocumentCategory.GAS_SAFETY
                }
              />
            </>
          ) : undefined
        }
      />

      <DocumentsTabs counts={screen.counts} />

      {isList ? (
        <div className="space-y-6">
          <DocumentsFilterBar
            properties={screen.properties}
            portfolios={screen.portfolios}
            tenancies={screen.tenancies}
            customCategories={customForPickers}
          />
          <ExpiryTiles buckets={screen.buckets} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderClock className="h-5 w-5 text-primary" />
                {activeTab === "receipts" ? "Receipts" : "Documents"}
              </CardTitle>
              <CardDescription>
                Soonest expiry first; documents without an expiry date appear
                last.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {screen.documents.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    icon={<FileText className="h-6 w-6" />}
                    title={
                      activeTab === "receipts"
                        ? "No receipts match"
                        : "No documents match"
                    }
                    description="Upload a file or adjust the filters above."
                  />
                </div>
              ) : (
                <DocumentsTable
                  rows={screen.documents}
                  customNames={screen.customNames}
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "reports" ? <ReportsSection screen={screen} /> : null}

      {activeTab === "custom" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Custom categories</CardTitle>
              <CardDescription>
                Your own labels for grouping documents.
              </CardDescription>
            </div>
            {canManage ? <AddCustomCategoryDialog variant="primary" /> : null}
          </CardHeader>
          <CardContent>
            <CustomCategoriesManager categories={screen.customCategories} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
