import { Router } from "express";
import * as packageController from "../controllers/packageControllers";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authMiddleware, adminOnly, packageController.listPackages);
router.post("/", authMiddleware, adminOnly, packageController.createPackage);
router.put("/:id", authMiddleware, adminOnly, packageController.updatePackage);
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  packageController.deletePackage
);

export default router;
