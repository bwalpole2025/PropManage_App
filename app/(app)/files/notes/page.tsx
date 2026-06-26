import { StickyNote } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getNotesScreen, type NoteSource } from "@/services/notes";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { NotesFilterBar } from "@/components/notes/notes-filter-bar";
import { formatDate } from "@/lib/format";

function SourceBadge({ source }: { source: NoteSource }) {
  if (source === "tenant") return <Badge tone="info">Tenant</Badge>;
  if (source === "transaction") return <Badge tone="primary">Transaction</Badge>;
  return <Badge tone="neutral">Property</Badge>;
}

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const { rows, properties, tenants } = await getNotesScreen(ctx.entityId, {
    propertyId: sp.propertyId,
    tenantId: sp.tenantId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Notes from properties, tenancies and transactions — gathered in one place."
      />

      <NotesFilterBar properties={properties} tenants={tenants} />

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<StickyNote className="h-6 w-6" />}
                title="Nothing to show"
                description="Notes added against a property, tenancy or transaction will appear here."
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Linked To</TH>
                  <TH>Description</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((n) => (
                  <TR key={n.id}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <SourceBadge source={n.source} />
                        <span className="text-sm">{n.linkedToLabel}</span>
                      </div>
                    </TD>
                    <TD className="max-w-md whitespace-pre-wrap text-muted-foreground">
                      {n.description}
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatDate(n.date)}
                    </TD>
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
