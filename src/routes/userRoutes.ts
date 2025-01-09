import { Router } from "express";
import * as userController from "../controllers/userControllers";
import {
  authMiddleware,
  adminOnly,
  canManageRoot,
  canDeleteUser,
} from "../middlewares/authMiddleware";

const router = Router();

// Rotas básicas
router.get("/", authMiddleware, adminOnly, userController.listUsers);
router.post("/", authMiddleware, adminOnly, userController.createUser);

// Rotas que precisam de verificação especial para ROOT
router.put(
  "/:id",
  authMiddleware,
  adminOnly,
  canManageRoot,
  userController.updateUser
);
router.delete(
  "/:id",
  authMiddleware,
  adminOnly,
  canDeleteUser,
  userController.deleteUser
);

// Adicionar nova rota
router.post("/change-password", authMiddleware, userController.changePassword);

export default router;
