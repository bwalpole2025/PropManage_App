import { router, protectedProcedure } from "../init";

export const meRouter = router({
  // Active context for client widgets (org switcher, role-aware UI).
  context: protectedProcedure.query(({ ctx }) => ({
    user: ctx.user,
    entityId: ctx.entityId,
    entityName: ctx.entityName,
    role: ctx.role,
    memberships: ctx.memberships,
  })),
});
