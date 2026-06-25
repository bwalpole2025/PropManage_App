import { StickyNote } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { listNotes } from "@/services/notes";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export default async function NotesPage() {
  const ctx = await getActiveContext();
  const notes = await listNotes(ctx.entityId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notes"
        description="Free-text notes against properties and tenants."
      />

      <Card>
        <CardContent className="pt-6">
          {notes.length === 0 ? (
            <EmptyState
              icon={<StickyNote className="h-6 w-6" />}
              title="No notes yet"
              description="Jot down anything worth remembering — inspections, conversations, decisions."
            />
          ) : (
            <ul className="divide-y divide-border">
              {notes.map((n) => (
                <li key={n.id} className="py-4 first:pt-0">
                  <div className="mb-1 flex items-center gap-2">
                    {n.property ? (
                      <Badge tone="neutral">{n.property.addressLine1}</Badge>
                    ) : null}
                    {n.tenant ? (
                      <Badge tone="info">{n.tenant.name}</Badge>
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(n.date)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{n.description}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
