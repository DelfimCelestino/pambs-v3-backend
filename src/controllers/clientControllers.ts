import { Request, Response } from "express";
import { db } from "../lib/db";
import { createActivity } from "../services/activityService";
import bcrypt from "bcrypt";

export const listClients = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 200;
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      db.client.findMany({
        skip,
        take: limit,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          familyMembers: {
            include: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.client.count(),
    ]);

    res.json({
      success: true,
      data: clients,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("Error listing clients:", error);
    res
      .status(500)
      .json({ success: false, message: "Erro ao listar clientes" });
  }
};

export const getClientById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const client = await db.client.findUnique({
      where: { id },
      include: {
        plan: true,
        package: true,
        familyHead: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        familyMembers: {
          select: {
            id: true,
            name: true,
            code: true,
            package: true,
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Cliente não encontrado",
      });
      return;
    }

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar cliente",
    });
  }
};

export const toggleStatus = async (req: Request, res: Response) => {
  try {
    const requestingUser = (req as any).user;

    if (!["SUPER_ROOT", "ROOT", "ADMIN"].includes(requestingUser.role)) {
      res.status(403).json({
        success: false,
        message: "Você não tem permissão para alterar o status do cliente",
      });
      return;
    }

    const { id } = req.params;
    const { status } = req.body;

    const client = await db.client.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      data: client,
    });
  } catch (error) {
    console.error("Error updating client status:", error);
    res.status(500).json({
      success: false,
      message: "Erro interno ao alterar status do cliente",
    });
  }
};

export const createClient = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const client = await db.client.create({
      data: req.body,
    });

    await createActivity({
      type: "CLIENT_CREATED",
      message: `Cliente "${client.name}" cadastrado por ${user.name}`,
      userId: user.id,
      entityId: client.id,
    });

    res.json({ success: true, data: client });
  } catch (error) {
    console.error("Error creating client:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar cliente",
    });
  }
};

export const updateClient = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const client = await db.client.update({
      where: { id },
      data: req.body,
    });

    await createActivity({
      type: "CLIENT_UPDATED",
      message: `Cliente "${client.name}" atualizado por ${user.name}`,
      userId: user.id,
      entityId: client.id,
    });

    res.json({ success: true, data: client });
  } catch (error) {
    console.error("Error updating client:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar cliente",
    });
  }
};

export const deleteClient = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const client = await db.client.findUnique({ where: { id } });

    await db.client.delete({ where: { id } });

    await createActivity({
      type: "CLIENT_DELETED",
      message: `Cliente "${client?.name}" removido por ${user.name}`,
      userId: user.id,
      entityId: id,
    });

    res.json({ success: true });
  } catch (error) {
    // ... erro
  }
};

export const getClientDashboard = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user.id;

    const client = await db.client.findUnique({
      where: { id: clientId },
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
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Cliente não encontrado",
      });
      return;
    }

    const dashboardData = {
      id: client.id,
      name: client.name,
      code: client.code,
      status: client.status,
      plan: client.plan,
      package: client.package,
      isAdministrator: client.isAdministrator,
      isFamilyHead: client.familyMembers?.length > 0,
      members: client.familyMembers || [],
    };

    console.log("Dashboard data:", dashboardData); // Debug

    res.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Error fetching client dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar dados do dashboard",
    });
  }
};

export const assignPlanToClient = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { planId, packageId, members } = req.body;

    console.log("Request data:", {
      clientId,
      planId,
      packageId,
      members,
      url: req.originalUrl,
    });

    // Primeiro, atualiza o cliente principal
    try {
      const updatedClient = await db.client.update({
        where: { id: clientId },
        data: {
          planId,
          packageId,
          isAdministrator: true,
        },
      });
      console.log("2. Updated main client:", updatedClient);
    } catch (error) {
      console.error("Error updating main client:", error);
      throw error;
    }

    // Se houver membros, atualiza cada um deles
    if (members && members.length > 0) {
      console.log("3. Starting member updates");
      for (const member of members) {
        try {
          const updatedMember = await db.client.update({
            where: { id: member.id },
            data: {
              familyHeadId: clientId,
              planId,
              packageId: member.packageId,
            },
          });
          console.log(`4. Updated member ${member.id}:`, updatedMember);
        } catch (error) {
          console.error(`Error updating member ${member.id}:`, error);
          throw error;
        }
      }
    }

    // Busca o cliente atualizado com todas as relações
    try {
      console.log("5. Fetching final client data");
      const client = await db.client.findUnique({
        where: { id: clientId },
        include: {
          plan: true,
          package: true,
          familyMembers: {
            include: {
              package: true,
              plan: true,
            },
          },
        },
      });
      console.log("6. Final client data:", client);

      res.json({
        success: true,
        data: client,
      });
    } catch (error) {
      console.error("Error fetching final client data:", error);
      throw error;
    }
  } catch (error) {
    console.error("Final error in assignPlanToClient:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atribuir plano ao cliente",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getFamilyMembers = async (req: Request, res: Response) => {
  try {
    const clientId = (req as any).user.id;

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        familyMembers: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            package: true,
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Cliente não encontrado",
      });
      return;
    }

    res.json({
      success: true,
      data: client.familyMembers,
    });
  } catch (error) {
    console.error("Error fetching family members:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar membros da família",
    });
  }
};

export const getMemberMovements = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    const clientId = (req as any).user.id;
    const page = Number(req.query.page) || 1;
    const limit = 100;
    const skip = (page - 1) * limit;

    // Verifica se o membro pertence ao titular
    const member = await db.client.findFirst({
      where: {
        id: memberId,
        familyHead: {
          id: clientId,
        },
      },
    });

    if (!member) {
      res.status(403).json({
        success: false,
        message: "Acesso negado a este membro",
      });
      return;
    }

    const [movements, total] = await Promise.all([
      db.movement.findMany({
        where: {
          clientId: memberId,
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
          clientId: memberId,
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
    console.error("Error fetching member movements:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar movimentações do membro",
    });
  }
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clientId = (req as any).user.id;
    const { currentPassword, newPassword } = req.body;

    const client = await db.client.findUnique({
      where: { id: clientId },
      select: { password: true },
    });

    if (!client) {
      res.status(404).json({
        success: false,
        message: "Cliente não encontrado",
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      client.password
    );
    if (!isValidPassword) {
      res.status(400).json({
        success: false,
        message: "Senha atual incorreta",
      });
      return;
    }

    await db.client.update({
      where: { id: clientId },
      data: {
        password: await bcrypt.hash(newPassword, 10),
      },
    });

    res.json({
      success: true,
      message: "Senha alterada com sucesso",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao alterar senha",
    });
  }
};

export const resetClientPassword = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const defaultPassword = "12345678";

    await db.client.update({
      where: { id },
      data: {
        password: await bcrypt.hash(defaultPassword, 10),
      },
    });

    await createActivity({
      type: "PASSWORD_RESET",
      message: `Senha do cliente resetada por ${(req as any).user.name}`,
      userId: (req as any).user.id,
      entityId: id,
    });

    res.json({
      success: true,
      message: "Senha resetada com sucesso",
    });
  } catch (error) {
    console.error("Error resetting client password:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao resetar senha",
    });
  }
};

export const createTicket = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clientId = (req as any).user.id;
    const { title, content } = req.body;

    const ticket = await db.ticket.create({
      data: {
        title,
        clientId,
        messages: {
          create: {
            content,
            clientId,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar ticket",
    });
  }
};

export const getClientTickets = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clientId = (req as any).user.id;
    const tickets = await db.ticket.findMany({
      where: { clientId },
      include: {
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

export const addMessageToTicket = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const clientId = (req as any).user.id;
    const { ticketId } = req.params;
    const { content } = req.body;

    const message = await db.message.create({
      data: {
        content,
        clientId,
        ticketId,
      },
    });

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Error adding message:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao adicionar mensagem",
    });
  }
};
