import { NextResponse } from "next/server";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { buildAccountExport } from "@/services/data-export";
import { recordAudit, AuditAction } from "@/lib/audit";

// GDPR data-portability: a complete JSON export of the account's data. Owner-only
// (it spans every member's activity). Records a DATA_EXPORT audit entry.
export async function GET() {
  let ctx;
  try {
    ctx = await getActiveContext();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!can(ctx.role, Capability.MANAGE_BILLING)) {
    return NextResponse.json(
      { error: "Only the account owner can export account data." },
      { status: 403 },
    );
  }

  const data = await buildAccountExport(ctx.entityId);

  await recordAudit({
    accountId: ctx.entityId,
    actorUserId: ctx.user.id,
    action: AuditAction.DATA_EXPORT,
    metadata: {
      properties: data.properties.length,
      transactions: data.transactions.length,
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="propmanage-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
