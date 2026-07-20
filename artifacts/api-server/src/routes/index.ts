import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import expensesRouter from "./expenses";
import budgetRouter from "./budget";
import insightsRouter from "./insights";
import recurringRouter from "./recurring";
import preferencesRouter from "./preferences";
import goalsRouter from "./goals";
import challengesRouter from "./challenges";
import advisorRouter from "./advisor";
import notesRouter from "./notes";
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
router.use(recurringRouter);
router.use(preferencesRouter);
router.use(goalsRouter);
router.use(challengesRouter);
router.use(advisorRouter);
router.use(notesRouter);

export default router;
