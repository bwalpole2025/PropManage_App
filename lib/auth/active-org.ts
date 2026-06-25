import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../db";
import { MembershipStatus } from "../enums";
import { auth } from "./index";
import { can, type Capability } from "./rbac";

export const ACTIVE_ENTITY_COOKIE = "pm_active_entity";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface MembershipContext {
  membershipId: string;
  entityId: string;
  entityName: string;
  entityType: string;
  role: string;
  isPrincipal: boolean;
}

/** The resolved per-request access context. */
export interface ActiveContext {
  user: SessionUser;
  entityId: string;
  entityName: string;
  role: string;
  memberships: MembershipContext[];
}

/** Current authenticated user (or null). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/** Redirect to /login unless authenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** All active memberships for a user — the set of entities they can act in. */
export async function getMemberships(
  userId: string,
): Promise<MembershipContext[]> {
  const rows = await prisma.membership.findMany({
    where: { userId, status: MembershipStatus.ACTIVE },
    include: { entity: true },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    membershipId: m.id,
    entityId: m.accountId,
    entityName: m.entity.displayName,
    entityType: m.entity.type,
    role: m.role,
    isPrincipal: m.entity.principalUserId === userId,
  }));
}

/**
 * Resolve the active context for the current request: authenticated user +
 * their chosen (or default) entity. Redirects to /login if unauthenticated and
 * to /onboarding if the user has no entities yet.
 */
export async function getActiveContext(): Promise<ActiveContext> {
  const user = await requireUser();
  const memberships = await getMemberships(user.id);

  if (memberships.length === 0) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const requested = cookieStore.get(ACTIVE_ENTITY_COOKIE)?.value;
  const active =
    memberships.find((m) => m.entityId === requested) ?? memberships[0];

  return {
    user,
    entityId: active.entityId,
    entityName: active.entityName,
    role: active.role,
    memberships,
  };
}

/**
 * Assert the current user may perform `capability` on `entityId`. Returns the
 * membership role on success; redirects to /login or throws on failure. Use in
 * server actions and route handlers as a defence-in-depth check.
 */
export async function requireEntityAccess(
  entityId: string,
  capability: Capability,
): Promise<{ user: SessionUser; role: string }> {
  const user = await requireUser();
  const membership = await prisma.membership.findUnique({
    where: {
      userId_accountId: { userId: user.id, accountId: entityId },
    },
  });
  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    throw new Error("Forbidden: no access to this account.");
  }
  if (!can(membership.role, capability)) {
    throw new Error(`Forbidden: role ${membership.role} lacks ${capability}.`);
  }
  return { user, role: membership.role };
}

/** Convenience: the active entity id for a read query, with access implied. */
export async function getActiveEntityId(): Promise<string> {
  const ctx = await getActiveContext();
  return ctx.entityId;
}
