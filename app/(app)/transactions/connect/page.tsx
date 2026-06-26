import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { services } from "@/lib/services";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { BankConsent } from "@/components/transactions/bank-consent";

export default async function ConnectBankPage() {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_TRANSACTIONS)) {
    return <Forbidden backHref="/transactions" />;
  }

  const session = await services.bankFeed.createLinkSession({
    entityId: ctx.entityId,
    redirectUri: "/transactions/connect",
  });

  // A real provider (TrueLayer) returns an absolute hosted-consent URL — send
  // the user straight there. The mock returns an in-app path, handled below.
  if (/^https?:\/\//.test(session.linkUrl)) {
    redirect(session.linkUrl);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/transactions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to transactions
      </Link>
      <PageHeader
        title="Connect a bank"
        description="Securely link an account via open banking. We import your transactions automatically and never store your bank credentials."
      />
      <BankConsent linkSessionId={session.linkSessionId} />
    </div>
  );
}
