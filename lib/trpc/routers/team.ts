import { router, accountProcedure } from "../init";
import { listTeam } from "@/services/team";

export const teamRouter = router({
  list: accountProcedure.query(({ ctx }) => listTeam(ctx.entityId)),
});
