import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../lib/db";
import { PlanStatus, ClientStatus, UserRole } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    name: string;
    role?: UserRole;
    status?: string;
    plan?: {
      id: string;
      name: string;
      status: PlanStatus;
      type: string | null;
      createdAt: Date;
      updatedAt: Date;
      administratorId: string | null;
      clients: Array<{
        id: string;
        name: string;
        code: string;
        status: ClientStatus;
      }>;
    } | null;
    package?: {
      id: string;
      type: string;
    } | null;
    familyMembers?: Array<{
      id: string;
      name: string;
      code: string;
      status: ClientStatus;
    }>;
  };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      message: "Token não fornecido",
    });
    return;
  }

  const token = authHeader.split(" ")[1];

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      id: string;
    };

    // Tenta encontrar tanto em users quanto em clients
    const [adminUser, clientUser] = await Promise.all([
      db.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      }),
      db.client.findUnique({
        where: { id: decoded.id },
        include: {
          plan: {
            include: {
              clients: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  status: true,
                },
              },
            },
          },
          package: true,
          familyMembers: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const user = adminUser || clientUser;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    // Adiciona o usuário ao request
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Token inválido",
    });
    return;
  }
};

// Middleware para verificar permissões de admin
export const adminOnly = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user || !["ADMIN", "SUPER_ROOT", "ROOT"].includes(user?.role || "")) {
    res.status(403).json({
      success: false,
      message: "Acesso negado",
    });
    return;
  }
  next();
};

// Middleware específico para gerenciar ROOT
export const canManageRoot = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = (req as AuthenticatedRequest).user;

  // Apenas SUPER_ROOT pode gerenciar ROOT
  if (!user || user.role !== "SUPER_ROOT") {
    res.status(403).json({
      success: false,
      message: "Apenas Super Root pode gerenciar usuários Root",
    });
    return;
  }
  next();
};

// Middleware para verificar se pode deletar usuário
export const canDeleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requestingUser = (req as AuthenticatedRequest).user;
  const targetUserId = req.params.id;

  if (!targetUserId) {
    res.status(400).json({
      success: false,
      message: "ID do usuário não fornecido",
    });
    return;
  }

  try {
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { role: true },
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    if (!requestingUser || !requestingUser.role) {
      res.status(401).json({
        success: false,
        message: "Usuário não autorizado",
      });
      return;
    }

    // Se o alvo for ROOT, apenas SUPER_ROOT pode deletar
    if (targetUser.role === "ROOT" && requestingUser.role !== "SUPER_ROOT") {
      res.status(403).json({
        success: false,
        message: "Apenas Super Root pode remover usuários Root",
      });
      return;
    }

    // Se o alvo for SUPER_ROOT, ninguém pode deletar
    if (targetUser.role === "SUPER_ROOT") {
      res.status(403).json({
        success: false,
        message: "Usuários Super Root não podem ser removidos",
      });
      return;
    }

    next();
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Erro ao verificar permissões",
      });
    }
  }
};
