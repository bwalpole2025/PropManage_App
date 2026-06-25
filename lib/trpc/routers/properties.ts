import { z } from "zod";
import { router, accountProcedure, requireCapability } from "../init";
import { Capability } from "@/lib/auth/rbac";
import { listProperties, getProperty, listOwners } from "@/services/properties";
import { createPropertyCore } from "@/actions/property";
import { propertyCreateSchema } from "@/schemas/property";

export const propertiesRouter = router({
  list: accountProcedure.query(({ ctx }) => listProperties(ctx.entityId)),

  byId: accountProcedure
    .input(z.object({ propertyId: z.string().min(1) }))
    .query(({ ctx, input }) => getProperty(ctx.entityId, input.propertyId)),

  owners: accountProcedure.query(({ ctx }) => listOwners(ctx.entityId)),

  create: requireCapability(Capability.MANAGE_PROPERTIES)
    .input(propertyCreateSchema)
    .mutation(({ ctx, input }) => createPropertyCore(ctx.entityId, input)),
});
