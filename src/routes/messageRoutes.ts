import { Router } from "express";
import * as messageController from "../controllers/messageControllers";
import { authMiddleware, adminOnly } from "../middlewares/authMiddleware";

const router = Router();

// Rotas de tickets
router.get(
  "/tickets",
  authMiddleware,
  adminOnly,
  messageController.getAllTickets
);
router.put(
  "/tickets/:ticketId/status",
  authMiddleware,
  adminOnly,
  messageController.updateTicketStatus
);

// Rota para responder mensagens
router.post(
  "/:messageId/respond",
  authMiddleware,
  adminOnly,
  messageController.respondToMessage
);

export default router;
