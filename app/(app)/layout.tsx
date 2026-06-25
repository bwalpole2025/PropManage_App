import Link from "next/link";
import { Building2 } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { SidebarNav } from "@/components/layout/sidebar";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { VerifyEmailBanner } from "@/components/shared/verify-email-banner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getActiveContext();
  const account = await prisma.user.findUnique({
    where: { id: ctx.user.id },
    select: { emailVerified: true },
  });
  const unverified = !account?.emailVerified;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Building2 className="h-6 w-6 text-primary" />
          <Link href="/dashboard" className="text-lg font-semibold">
            PropManage
          </Link>
        </div>
        <div className="border-b border-border p-3">
          <OrgSwitcher memberships={ctx.memberships} activeId={ctx.entityId} />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          Estimates are not tax advice.
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">
              {ctx.entityName}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <UserMenu name={ctx.user.name} email={ctx.user.email} />
          </div>
        </header>
        {unverified ? <VerifyEmailBanner /> : null}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
