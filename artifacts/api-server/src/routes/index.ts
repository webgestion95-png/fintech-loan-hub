import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import loansRouter from "./loans";
import adminRouter from "./admin";
import admin2faRouter from "./admin2fa";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(loansRouter);
router.use(admin2faRouter);
router.use(adminRouter);

export default router;
