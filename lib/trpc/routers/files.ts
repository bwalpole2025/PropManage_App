import { router, accountProcedure } from "../init";
import { getFilesAndDates } from "@/services/files";

export const filesRouter = router({
  overview: accountProcedure.query(({ ctx }) => getFilesAndDates(ctx.entityId)),
});
