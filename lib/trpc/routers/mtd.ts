import { router, accountProcedure } from "../init";
import { getMtdOverview } from "@/services/mtd";

export const mtdRouter = router({
  overview: accountProcedure.query(({ ctx }) => getMtdOverview(ctx.entityId)),
});
