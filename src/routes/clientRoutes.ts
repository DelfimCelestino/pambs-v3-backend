import { Router } from "express";
import * as clientController from "../controllers/clientControllers";
import * as movementController from "../controllers/movementControllers";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const router = Router();
router.get("/movements", authMiddleware, movementController.listMovements);
router.get("/dashboard", authMiddleware, clientController.getClientDashboard);
router.get(
  "/family-members",
  authMiddleware,
  clientController.getFamilyMembers
);
router.get(
  "/family-members/:memberId/movements",
  authMiddleware,
  clientController.getMemberMovements
);

router.post("/tickets", authMiddleware, clientController.createTicket);
router.get("/tickets", authMiddleware, clientController.getClientTickets);
router.post(
  "/tickets/:ticketId/messages",
  authMiddleware,
  clientController.addMessageToTicket
);
router.post(
  "/change-password",
  authMiddleware,
  clientController.changePassword
);
router.get("/", authMiddleware, clientController.listClients);
router.get("/:id", authMiddleware, adminOnly, clientController.getClientById);
router.put(
  "/:id/status",
  authMiddleware,
  adminOnly,
  clientController.toggleStatus
);
router.post(
  "/:clientId/plan",
  authMiddleware,
  adminOnly,
  clientController.assignPlanToClient
);
router.post(
  "/:id/members",
  authMiddleware,
  adminOnly,
  clientController.assignPlanToClient
);

router.post(
  "/:id/reset-password",
  authMiddleware,
  adminOnly,
  clientController.resetClientPassword
);

router.get(
  "/:clientId/movements",
  authMiddleware,
  adminOnly,
  movementController.listClientMovements
);

export default router;
