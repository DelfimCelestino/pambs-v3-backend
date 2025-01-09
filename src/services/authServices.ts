import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../lib/db";

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined in the environment variables");
}

export async function authenticateClient(code: string, password: string) {
  try {
    const client = await db.client.findUnique({
      where: { code },
      include: {
        plan: true,
        package: true,
        administeredPlan: true,
      },
    });

    if (!client) {
      throw new Error("Usuario ou senha invalida");
    }

    const isValidPassword = await bcrypt.compare(password, client.password);

    if (!isValidPassword) {
      throw new Error("Usuário ou senha invalida");
    }
    if (client.status === "INACTIVE") {
      throw new Error("Conta inativa. Entre em contato com o suporte.");
    }

    const token = jwt.sign(
      {
        id: client.id,
        code: client.code,
        name: client.name,
        role: "CLIENT",
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    // Remova os campos sensíveis antes de retornar
    const clientData = {
      id: client.id,
      code: client.code,
      name: client.name,
      phone: client.phone,
      address1: client.address1,
      address2: client.address2,
      balance: client.balance,
      status: client.status,
      familyHeadId: client.familyHeadId,
      plan: client.plan,
      package: client.package,
      administeredPlan: client.administeredPlan,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };

    return {
      token,
      client: clientData,
    };
  } catch (error) {
    throw error;
  }
}

export const authenticateUser = async (email: string, password: string) => {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new Error("Senha incorreta");
  }
  if (user.status === "INACTIVE") {
    throw new Error("Conta inativa. Entre em contato com o suporte.");
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || "secret", {
    expiresIn: "24h",
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
};
