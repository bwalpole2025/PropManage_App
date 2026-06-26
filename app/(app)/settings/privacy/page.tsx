import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { PrivacyControls } from "@/components/settings/privacy-controls";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const ctx = await getActiveContext();
  const account = await prisma.account.findUnique({
    where: { id: ctx.entityId },
    select: { displayName: true, marketingOptIn: true },
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Privacy &amp; your data</h2>
        <p className="text-sm text-muted-foreground">
          Export or erase your data, manage marketing consent and cookie
          preferences. See our{" "}
          <a href="/privacy" className="text-primary underline" target="_blank" rel="noreferrer">
            privacy policy
          </a>
          .
        </p>
      </div>

      <PrivacyControls
        accountName={account?.displayName ?? ""}
        marketingOptIn={account?.marketingOptIn ?? false}
        canManage={can(ctx.role, Capability.MANAGE_BILLING)}
      />
    </div>
  );
}
