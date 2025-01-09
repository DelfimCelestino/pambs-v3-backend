import { Request, Response } from "express";
import { db } from "../lib/db";

export const getAllTickets = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tickets = await db.ticket.findMany({
      include: {
        client: {
          select: {
            name: true,
            code: true,
          },
        },
        messages: {
          include: {
            respondedBy: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar tickets",
    });
  }
};

export const updateTicketStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    const ticket = await db.ticket.update({
      where: { id: ticketId },
      data: { status },
    });

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar status do ticket",
    });
  }
};

export const respondToMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { response } = req.body;
    const userId = (req as any).user.id;

    // Primeiro verificamos se a mensagem existe
    const existingMessage = await db.message.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      res.status(404).json({
        success: false,
        message: "Mensagem não encontrada",
      });
      return;
    }

    const message = await db.message.update({
      where: { id: messageId },
      data: {
        response,
        status: "ANSWERED",
        respondedById: userId,
      },
      include: {
        respondedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Error responding to message:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao responder mensagem",
    });
  }
};
