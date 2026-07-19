import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import expensesRouter from "./expenses";
import budgetRouter from "./budget";
import insightsRouter from "./insights";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

// Public: health check and auth endpoints only
router.use(healthRouter);
router.use(authRouter);

// All application data endpoints require an authenticated session
router.use(requireAuth);
router.use(expensesRouter);
router.use(budgetRouter);
router.use(insightsRouter);

export default router;
