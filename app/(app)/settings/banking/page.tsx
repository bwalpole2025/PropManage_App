import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { Forbidden } from "@/components/shared/forbidden";
import { BankConnectionsManager } from "@/components/transactions/bank-connections-manager";

export default async function BankingSettingsPage() {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_TRANSACTIONS)) {
    return <Forbidden backHref="/settings" />;
  }

  const connections = await prisma.bankConnection.findMany({
    where: { accountId: ctx.entityId },
    include: {
      accounts: {
        select: { id: true, name: true, accountNumberMasked: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = connections.map((c) => ({
    id: c.id,
    institutionName: c.institutionName,
    status: c.status,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    accounts: c.accounts,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Bank feeds</h2>
        <p className="text-sm text-muted-foreground">
          Connections import transactions via open banking. We store a revocable
          access token only — never your bank credentials — and respect consent
          expiry.
        </p>
      </div>
      <BankConnectionsManager connections={rows} />
    </div>
  );
}
