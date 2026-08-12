import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profilesRouter from "./profiles";
import recoveryRouter from "./recovery";
import foodsRouter from "./foods";
import mealLogsRouter from "./mealLogs";
import dashboardRouter from "./dashboard";
import labsRouter from "./labs";
import aiRouter from "./ai";
import adminRouter from "./admin";
const router: IRouter = Router();

router.use(healthRouter);
router.use(profilesRouter);
router.use(recoveryRouter);
router.use(foodsRouter);
router.use(mealLogsRouter);
router.use(dashboardRouter);
router.use(labsRouter);
router.use(aiRouter);
router.use(adminRouter);

export default router;
