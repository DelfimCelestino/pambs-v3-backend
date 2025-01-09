import { db } from "../lib/db";
import bcrypt from "bcrypt";

export async function initializeSuperRoot() {
  try {
    // Verifica se já existe um SUPER_ROOT
    const superRoot = await db.user.findFirst({
      where: { role: "SUPER_ROOT" },
    });

    if (!superRoot) {
      // Cria o SUPER_ROOT se não existir
      await db.user.create({
        data: {
          email: "super@sistema.com",
          name: "Super Root",
          password: await bcrypt.hash("celestino03092000", 10),
          role: "SUPER_ROOT",
          canDelete: false,
        },
      });
      console.log("🚀 Super Root criado com sucesso!");
    } else {
      console.log("✅ Super Root já existe no sistema.");
    }
  } catch (error) {
    console.error("❌ Erro ao inicializar Super Root:", error);
  }
}
