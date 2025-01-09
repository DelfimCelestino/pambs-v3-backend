import { Router } from "express";
import * as dashboardController from "../controllers/dashboardControllers";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const router = Router();

router.get(
  "/stats",
  authMiddleware,
  adminOnly,
  dashboardController.getDashboardStats
);
router.get(
  "/activities",
  authMiddleware,
  adminOnly,
  dashboardController.getActivities
);

export default router;
