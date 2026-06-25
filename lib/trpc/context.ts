import "server-only";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@/lib/auth";
import {
  getMemberships,
  ACTIVE_ENTITY_COOKIE,
  type SessionUser,
  type MembershipContext,
} from "@/lib/auth/active-org";

export interface Context {
  user: SessionUser | null;
  entityId: string | null;
  entityName: string | null;
  role: string | null;
  memberships: MembershipContext[];
}

/**
 * Build the request context from the Auth.js session + the active-entity cookie.
 * Mirrors the active-entity selection in getActiveContext() (lib/auth/active-org.ts)
 * so RSC and tRPC always agree on the active account — but returns null instead of
 * redirecting (an API boundary returns 401/403, it doesn't redirect).
 */
export async function createContextInner(
  activeEntityCookie?: string,
): Promise<Context> {
  const session = await auth();
  const user: SessionUser | null = session?.user?.id
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }
    : null;

  if (!user) {
    return {
      user: null,
      entityId: null,
      entityName: null,
      role: null,
      memberships: [],
    };
  }

  const memberships = await getMemberships(user.id);
  const active =
    memberships.find((m) => m.entityId === activeEntityCookie) ?? memberships[0];

  return {
    user,
    entityId: active?.entityId ?? null,
    entityName: active?.entityName ?? null,
    role: active?.role ?? null,
    memberships,
  };
}

/** HTTP route-handler context — reads the active-entity cookie off the request. */
export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<Context> {
  const cookie = opts.req.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ACTIVE_ENTITY_COOKIE}=`));
  const activeEntityCookie = match
    ? decodeURIComponent(match.slice(match.indexOf("=") + 1))
    : undefined;
  return createContextInner(activeEntityCookie);
}
