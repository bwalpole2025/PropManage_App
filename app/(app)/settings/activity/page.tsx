import { ScrollText, ShieldAlert } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { canViewAuditLog } from "@/lib/auth/rbac";
import { listAuditLog } from "@/services/audit";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Compact one-line summary of an audit entry's metadata. */
function summariseMeta(meta: unknown): string {
  if (!meta || typeof meta !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
    if (v == null || typeof v === "object") continue;
    parts.push(`${k}: ${String(v)}`);
  }
  return parts.slice(0, 4).join(" · ");
}

export default async function ActivityLogPage() {
  const ctx = await getActiveContext();

  if (!canViewAuditLog(ctx.role)) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-5 w-5" />}
        title="Not available for your role"
        description="The activity log is visible to account owners, managers and accountants."
      />
    );
  }

  const entries = await listAuditLog(ctx.entityId, { limit: 200 });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Activity log</h2>
        <p className="text-sm text-muted-foreground">
          An append-only record of financial changes and external submissions
          (HMRC&nbsp;/&nbsp;open&nbsp;banking) on this account.
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-5 w-5" />}
          title="No activity yet"
          description="Financial changes and submissions will appear here as they happen."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Action</TH>
                  <TH>Who</TH>
                  <TH>Details</TH>
                </TR>
              </THead>
              <TBody>
                {entries.map((e) => (
                  <TR key={e.id}>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {formatDate(e.at)}
                    </TD>
                    <TD>
                      <Badge tone={e.isExternal ? "primary" : "neutral"}>
                        {e.actionLabel}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap">{e.actorName}</TD>
                    <TD className="text-muted-foreground">
                      {summariseMeta(e.metadata) || "—"}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
