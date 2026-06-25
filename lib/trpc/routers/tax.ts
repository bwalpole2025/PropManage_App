import { z } from "zod";
import { router, accountProcedure } from "../init";
import { getTaxEstimate } from "@/services/tax";
import type { TaxBand } from "@/lib/tax";

export const taxRouter = router({
  estimate: accountProcedure
    .input(
      z
        .object({
          taxYear: z.string().optional(),
          taxBand: z.enum(["BASIC", "HIGHER", "ADDITIONAL"]).optional(),
          usePropertyAllowance: z.boolean().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) =>
      getTaxEstimate(ctx.entityId, input?.taxYear, {
        taxBand: input?.taxBand as TaxBand | undefined,
        usePropertyAllowance: input?.usePropertyAllowance,
      }),
    ),
});
