import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { db } from "../lib/db";

interface AuthenticatedRequest extends Request {
  user?:
    | { userId: string; role: "USER" | "PROMOTER" | "ADMIN"; promoter: boolean }
    | JwtPayload;
}

export const listMovements = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;
    const clientId = req.user?.userId as string;

    const [movements, total] = await Promise.all([
      db.movement.findMany({
        where: {
          clientId,
        },
        take: limit,
        skip,
        orderBy: {
          datadoc: "desc",
        },
        select: {
          id: true,
          tipodoc: true,
          numdoc: true,
          datadoc: true,
          balance: true,
        },
      }),
      db.movement.count({
        where: {
          clientId,
        },
      }),
    ]);

    const formattedMovements = movements.map((movement) => ({
      ...movement,
      type:
        movement.tipodoc === "ADC"
          ? "Crédito"
          : movement.tipodoc === "VD"
          ? "Venda a dinheiro"
          : movement.tipodoc === "FE"
          ? "Fatura entidade"
          : movement.tipodoc === "PAGCL"
          ? "Recibo"
          : movement.tipodoc === "FAC"
          ? "Débito"
          : movement.tipodoc,
    }));

    res.json({
      success: true,
      data: formattedMovements,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error listing movements:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar movimentações",
    });
  }
};

export const listClientMovements = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;
    const clientId = req.params.clientId;

    const [movements, total] = await Promise.all([
      db.movement.findMany({
        where: {
          clientId,
        },
        take: limit,
        skip,
        orderBy: {
          datadoc: "desc",
        },
        select: {
          id: true,
          tipodoc: true,
          numdoc: true,
          datadoc: true,
          balance: true,
          client: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      }),
      db.movement.count({
        where: {
          clientId,
        },
      }),
    ]);

    const formattedMovements = movements.map((movement) => ({
      ...movement,
      type:
        movement.tipodoc === "ADC"
          ? "Crédito"
          : movement.tipodoc === "VD"
          ? "Venda a dinheiro"
          : movement.tipodoc === "FE"
          ? "Fatura entidade"
          : movement.tipodoc === "PAGCL"
          ? "Recibo"
          : movement.tipodoc === "FAC"
          ? "Débito"
          : movement.tipodoc,
    }));

    res.json({
      success: true,
      data: formattedMovements,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error listing client movements:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar movimentações do cliente",
    });
  }
};
