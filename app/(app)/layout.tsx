import { cookies } from "next/headers";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { TrialBanner } from "@/components/layout/trial-banner";
import { HelpFab } from "@/components/layout/help-fab";
import { VerifyEmailBanner } from "@/components/shared/verify-email-banner";
import { CoachmarkProvider } from "@/components/shared/coachmark-provider";
import type { CoachmarkState } from "@/actions/coachmarks";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getActiveContext();
  const [user, account, cookieStore] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { emailVerified: true, coachmarkState: true },
    }),
    prisma.account.findUnique({
      where: { id: ctx.entityId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    }),
    cookies(),
  ]);
  const unverified = !user?.emailVerified;
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        defaultCollapsed={collapsed}
        memberships={ctx.memberships}
        activeId={ctx.entityId}
        userEmail={ctx.user.email ?? ""}
        userName={ctx.user.name ?? ""}
        accountName={ctx.entityName}
      />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center border-b border-border bg-card px-6">
          <Breadcrumbs />
        </header>
        <TrialBanner
          subscriptionStatus={account?.subscriptionStatus ?? "active"}
          trialEndsAt={
            account?.trialEndsAt ? account.trialEndsAt.toISOString() : null
          }
          accountId={ctx.entityId}
        />
        {unverified ? <VerifyEmailBanner /> : null}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-6xl">
            <CoachmarkProvider
              initial={(user?.coachmarkState as CoachmarkState | null) ?? {}}
            >
              {children}
            </CoachmarkProvider>
          </div>
        </main>
      </div>

      <HelpFab />
    </div>
  );
}
