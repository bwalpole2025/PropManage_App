import { router } from "../init";
import { meRouter } from "./me";
import { dashboardRouter } from "./dashboard";
import { propertiesRouter } from "./properties";
import { transactionsRouter } from "./transactions";
import { taxRouter } from "./tax";
import { filesRouter } from "./files";
import { mtdRouter } from "./mtd";
import { teamRouter } from "./team";

export const appRouter = router({
  me: meRouter,
  dashboard: dashboardRouter,
  properties: propertiesRouter,
  transactions: transactionsRouter,
  tax: taxRouter,
  files: filesRouter,
  mtd: mtdRouter,
  team: teamRouter,
});

export type AppRouter = typeof appRouter;
