import { cookies } from "next/headers";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { SIDEBAR_COOKIE } from "@/components/layout/nav-config";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { NotificationBell } from "@/components/layout/notification-bell";
import { listForUser, unreadCount } from "@/lib/notifications/service";
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
  const [user, account, cookieStore, notifItems, notifCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: { emailVerified: true, coachmarkState: true },
    }),
    prisma.account.findUnique({
      where: { id: ctx.entityId },
      select: { subscriptionStatus: true, trialEndsAt: true },
    }),
    cookies(),
    listForUser(ctx.entityId, ctx.user.id, { limit: 15 }),
    unreadCount(ctx.entityId, ctx.user.id),
  ]);
  const unverified = !user?.emailVerified;
  const collapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "1";
  const bellItems = notifItems.map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
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
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <Breadcrumbs />
          <NotificationBell
            key={ctx.entityId}
            initialCount={notifCount}
            initialItems={bellItems}
          />
        </header>
        <TrialBanner
          subscriptionStatus={account?.subscriptionStatus ?? "active"}
          trialEndsAt={
            account?.trialEndsAt ? account.trialEndsAt.toISOString() : null
          }
          accountId={ctx.entityId}
        />
        {unverified ? <VerifyEmailBanner /> : null}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-6 focus:outline-none"
        >
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
