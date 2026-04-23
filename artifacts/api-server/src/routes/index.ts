import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import activitiesRouter from "./activities";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(activitiesRouter);
router.use(adminRouter);

export default router;
