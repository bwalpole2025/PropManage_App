import "server-only";
import { cookies } from "next/headers";
import { createCallerFactory } from "./init";
import { appRouter } from "./routers/_app";
import { createContextInner } from "./context";
import { ACTIVE_ENTITY_COOKIE } from "@/lib/auth/active-org";

/**
 * Server-side tRPC caller for RSC prefetch. Uses the same active-entity cookie
 * + context as the HTTP route, so RSC and client hooks never diverge.
 */
export async function getServerCaller() {
  const cookieStore = await cookies();
  const active = cookieStore.get(ACTIVE_ENTITY_COOKIE)?.value;
  const ctx = await createContextInner(active);
  return createCallerFactory(appRouter)(ctx);
}
