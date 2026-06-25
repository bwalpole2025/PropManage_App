import { router, accountProcedure } from "../init";
import { getDashboardData } from "@/services/dashboard";

export const dashboardRouter = router({
  // Wraps the exact function the RSC dashboard page already calls.
  summary: accountProcedure.query(({ ctx }) => getDashboardData(ctx.entityId)),
});
