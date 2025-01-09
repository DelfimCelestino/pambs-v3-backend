import { Router } from "express";
import * as planController from "../controllers/planControllers";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const router = Router();

// Planos
router.get("/", authMiddleware, planController.listPlans);
router.post("/", authMiddleware, adminOnly, planController.createPlan);
router.put("/:id", authMiddleware, adminOnly, planController.updatePlan);
router.delete("/:id", authMiddleware, adminOnly, planController.deletePlan);

// Pacotes
router.get("/packages", authMiddleware, planController.listPackages);
router.post(
  "/packages",
  authMiddleware,
  adminOnly,
  planController.createPackage
);
router.put(
  "/packages/:id",
  authMiddleware,
  adminOnly,
  planController.updatePackage
);
router.delete(
  "/packages/:id",
  authMiddleware,
  adminOnly,
  planController.deletePackage
);

// Remoção de planos/membros
router.post(
  "/remove",
  authMiddleware,
  adminOnly,
  planController.removePlanFromClient
);
router.post(
  "/remove-member",
  authMiddleware,
  adminOnly,
  planController.removeMemberFromPlan
);

export default router;
