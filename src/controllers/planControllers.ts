import { Request, Response } from "express";
import { db } from "../lib/db";
import { createActivity } from "../services/activityService";

export const listPlans = async (req: Request, res: Response): Promise<void> => {
  try {
    const plans = await db.plan.findMany({
      where: { status: "ACTIVE" },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar planos",
    });
  }
};

export const listPackages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const packages = await db.package.findMany();

    res.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error("Error fetching packages:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar pacotes",
    });
  }
};

export const assignPlanToClient = async (req: Request, res: Response) => {
  try {
    const { clientId, planId, packageId, members } = req.body;
    console.log("1. Starting plan assignment with data:", {
      clientId,
      planId,
      packageId,
      members,
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
export const removePlanFromClient = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { clientId } = req.body;

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: { plan: true },
    });

    const planName = client?.plan?.name;

    await db.client.update({
      where: { id: clientId },
      data: {
        familyHeadId: null,
        planId: null,
        packageId: null,
        isAdministrator: false,
      },
    });

    await createActivity({
      type: "PLAN_REMOVED",
      message: `Plano "${planName}" removido do cliente "${client?.name}" por ${user.name}`,
      userId: user.id,
      entityId: clientId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing plan:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover plano",
    });
  }
};

export const removeMemberFromPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { memberId } = req.body;

    // Remove o membro do plano
    const updatedMember = await db.client.update({
      where: { id: memberId },
      data: {
        familyHeadId: null,
        planId: null,
        packageId: null,
        isAdministrator: false,
      },
    });

    res.json({
      success: true,
      data: updatedMember,
    });
  } catch (error) {
    console.error("Error removing member:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover membro",
    });
  }
};

export const createPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;
    const plan = await db.plan.create({
      data: req.body,
    });

    await createActivity({
      type: "PLAN_CREATED",
      message: `Plano "${plan.name}" criado por ${user.name}`,
      userId: user.id,
      entityId: plan.id,
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar plano",
    });
  }
};

export const createPackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, type } = req.body;

    const package_ = await db.package.create({
      data: {
        name,
        type,
      },
    });

    res.json({
      success: true,
      data: package_,
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar pacote",
    });
  }
};

export const updatePlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, description, maxMembers, status } = req.body;

    const plan = await db.plan.update({
      where: { id },
      data: {
        name,
        type,
        description,
        maxMembers,
        status,
      },
    });

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar plano",
    });
  }
};

export const updatePackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type } = req.body;

    const package_ = await db.package.update({
      where: { id },
      data: {
        name,
        type,
      },
    });

    res.json({
      success: true,
      data: package_,
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar pacote",
    });
  }
};

export const deletePlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se existem clientes usando este plano
    const clientsWithPlan = await db.client.findMany({
      where: { planId: id },
    });

    // Remover o plano de todos os clientes primeiro
    if (clientsWithPlan.length > 0) {
      await db.client.updateMany({
        where: { planId: id },
        data: {
          planId: null,
          packageId: null, // Remove também o pacote
          isAdministrator: false,
          familyHeadId: null,
        },
      });
    }

    // Agora podemos deletar o plano
    await db.plan.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Plano removido com sucesso",
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover plano",
    });
  }
};

export const deletePackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Verificar se existem clientes usando este pacote
    const clientsWithPackage = await db.client.findMany({
      where: { packageId: id },
    });

    // Remover o pacote de todos os clientes primeiro
    if (clientsWithPackage.length > 0) {
      await db.client.updateMany({
        where: { packageId: id },
        data: {
          packageId: null,
        },
      });
    }

    // Agora podemos deletar o pacote
    await db.package.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Pacote removido com sucesso",
    });
  } catch (error) {
    console.error("Error deleting package:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao remover pacote",
    });
  }
};
