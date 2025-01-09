import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Criar SUPER_ROOT se não existir
  const superRoot = await prisma.user.upsert({
    where: { email: "super@sistema.com" },
    update: {},
    create: {
      email: "super@sistema.com",
      name: "Super Root",
      password: await bcrypt.hash("superroot123", 10),
      role: "SUPER_ROOT",
      canDelete: false,
    },
  });

  // Criar ROOT se não existir
  const root = await prisma.user.upsert({
    where: { email: "root@sistema.com" },
    update: {},
    create: {
      email: "root@sistema.com",
      name: "Root",
      password: await bcrypt.hash("root123", 10),
      role: "ROOT",
      canDelete: false,
    },
  });

  console.log({ superRoot, root });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
