import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import budgetRouter from "./budget";
import insightsRouter from "./insights";

const router: IRouter = Router();

router.use(healthRouter);
router.use(expensesRouter);
router.use(budgetRouter);
router.use(insightsRouter);

export default router;
