import { Request, Response } from "express";
import { db } from "../lib/db";
import bcrypt from "bcrypt";
import { createActivity } from "../services/activityService";

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestingUser = (req as any).user;

    // Verifica se o usuário tem permissão (SUPER_ROOT, ROOT ou ADMIN)
    if (!["SUPER_ROOT", "ROOT", "ADMIN"].includes(requestingUser.role)) {
      res.status(403).json({
        success: false,
        message: "Você não tem permissão para listar usuários",
      });
      return;
    }

    const page = Number(req.query.page) || 1;
    const limit = 200;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          canDelete: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.user.count(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar usuários",
    });
  }
};

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const requestingUser = (req as any).user;
    const { name, email, role } = req.body;

    // Apenas SUPER_ROOT pode criar ROOT
    if (role === "ROOT" && requestingUser.role !== "SUPER_ROOT") {
      res.status(403).json({
        success: false,
        message: "Apenas Super Root pode criar usuários Root",
      });
      return;
    }

    // Verifica se o usuário tem permissão (SUPER_ROOT, ROOT ou ADMIN)
    if (!["SUPER_ROOT", "ROOT", "ADMIN"].includes(requestingUser.role)) {
      res.status(403).json({
        success: false,
        message: "Você não tem permissão para criar usuários",
      });
      return;
    }

    const defaultPassword = "12345678";

    // Verificar se já existe um usuário com este email
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email já está em uso",
      });
      return;
    }

    // Criar novo usuário com senha padrão
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await createActivity({
      type: "USER_CREATED",
      message: `Novo usuário ${role} criado: ${name}`,
      userId: requestingUser.id,
      entityId: user.id,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar usuário",
    });
  }
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const requestingUser = (req as any).user;

    // Verificar se o email já está em uso por outro usuário
    const existingUser = await db.user.findFirst({
      where: {
        email,
        NOT: {
          id,
        },
      },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email já está em uso",
      });
      return;
    }

    const user = await db.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    await createActivity({
      type: "USER_UPDATED",
      message: `Usuário ${user.name} (${user.role}) atualizado por ${requestingUser.name}`,
      userId: requestingUser.id,
      entityId: user.id,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar usuário",
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;
    const defaultPassword = "12345678";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const user = await db.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
      select: {
        name: true,
        role: true,
      },
    });

    await createActivity({
      type: "PASSWORD_RESET",
      message: `Senha do usuário ${user.name} (${user.role}) resetada por ${requestingUser.name}`,
      userId: requestingUser.id,
      entityId: id,
    });

    res.json({
      success: true,
      message: "Senha resetada com sucesso",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao resetar senha",
    });
  }
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const requestingUser = (req as any).user;

    const userToDelete = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        role: true,
        canDelete: true,
      },
    });

    if (!userToDelete) {
      res.status(404).json({
        success: false,
        message: "Usuário não encontrado",
      });
      return;
    }

    // Verificar permissões
    if (!userToDelete.canDelete) {
      res.status(403).json({
        success: false,
        message: "Este usuário não pode ser removido",
      });
      return;
    }

    if (userToDelete.role === "ROOT" && requestingUser.role !== "SUPER_ROOT") {
      res.status(403).json({
        success: false,
        message: "Apenas o Super Root pode remover usuários Root",
      });
      return;
    }

    await db.user.delete({
      where: { id },
    });

    await createActivity({
      type: "USER_DELETED",
      message: `Usuário ${userToDelete?.name} (${userToDelete?.role}) removido por ${requestingUser.name}`,
      userId: requestingUser.id,
      entityId: id,
    });

    res.json({
      success: true,
      message: "Usuário removido com sucesso",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover usuário",
    });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    // Validar se as senhas foram fornecidas
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Senha atual e nova senha são obrigatórias",
      });
      return;
    }

    // Validar tamanho mínimo da senha
    if (newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "A nova senha deve ter pelo menos 6 caracteres",
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        message: "Senha atual incorreta",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await createActivity({
      type: "PASSWORD_CHANGED",
      message: `${user.name} alterou sua própria senha`,
      userId: user.id,
      entityId: user.id,
    });

    res.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao alterar senha. Por favor, tente novamente.",
    });
  }
};
