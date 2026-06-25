import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";
import { can, type Capability } from "@/lib/auth/rbac";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zod: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

/** Requires an authenticated user; narrows ctx.user to non-null. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/** Requires an active entity membership; narrows entityId/role to non-null. */
export const accountProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.entityId || !ctx.role) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active account." });
  }
  return next({ ctx: { ...ctx, entityId: ctx.entityId, role: ctx.role } });
});

/** Capability-gated procedure — mirrors requireEntityAccess() defence-in-depth. */
export function requireCapability(capability: Capability) {
  return accountProcedure.use(({ ctx, next }) => {
    if (!can(ctx.role, capability)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Role ${ctx.role} lacks ${capability}.`,
      });
    }
    return next({ ctx });
  });
}
