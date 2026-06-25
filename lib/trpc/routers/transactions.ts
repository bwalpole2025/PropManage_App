import { z } from "zod";
import { router, accountProcedure } from "../init";
import { listTransactions, listUnreconciled } from "@/services/transactions";

const filtersSchema = z
  .object({
    propertyId: z.string().optional(),
    category: z.string().optional(),
    direction: z.string().optional(),
    status: z.string().optional(),
    uncategorisedOnly: z.boolean().optional(),
  })
  .optional();

export const transactionsRouter = router({
  list: accountProcedure
    .input(filtersSchema)
    .query(({ ctx, input }) => listTransactions(ctx.entityId, input ?? {})),

  unreconciled: accountProcedure.query(({ ctx }) =>
    listUnreconciled(ctx.entityId),
  ),
});
