import { Request, Response } from "express";
import { db } from "../lib/db";
import { createActivity } from "../services/activityService";

export const createPackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { name, type } = req.body;

    const pkg = await db.package.create({
      data: {
        name,
        type,
      },
    });

    await createActivity({
      type: "PACKAGE_CREATED",
      message: `Pacote "${pkg.name}" criado por ${user.name}`,
      userId: user.id,
      entityId: pkg.id,
    });

    res.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    console.error("Error creating package:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao criar pacote",
    });
  }
};

export const updatePackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { name, type } = req.body;

    const pkg = await db.package.update({
      where: { id },
      data: {
        name,
        type,
      },
    });

    await createActivity({
      type: "PACKAGE_UPDATED",
      message: `Pacote "${pkg.name}" atualizado por ${user.name}`,
      userId: user.id,
      entityId: pkg.id,
    });

    res.json({
      success: true,
      data: pkg,
    });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao atualizar pacote",
    });
  }
};

export const deletePackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    const pkg = await db.package.findUnique({ where: { id } });
    await db.package.delete({ where: { id } });

    await createActivity({
      type: "PACKAGE_DELETED",
      message: `Pacote "${pkg?.name}" removido por ${user.name}`,
      userId: user.id,
      entityId: id,
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

export const listPackages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const packages = await db.package.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: packages,
    });
  } catch (error) {
    console.error("Error listing packages:", error);
    res.status(500).json({
      success: false,
      message: "Erro ao listar pacotes",
    });
  }
};
