import { Request, Response } from "express";
import * as authService from "../services/authServices";

interface AuthError extends Error {
  message: string;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, code, password } = req.body;
  console.log(req.body);

  try {
    if (email) {
      const result = await authService.authenticateUser(email, password);
      res.json({
        success: true,
        token: result.token,
        userData: result.user,
        type: "ADMIN",
      });
      return;
    }

    if (code) {
      const result = await authService.authenticateClient(code, password);
      res.json({
        success: true,
        token: result.token,
        clientData: result.client,
        type: "CLIENT",
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: "Credenciais inválidas",
    });
  } catch (error: unknown) {
    const authError = error as AuthError;
    res.status(400).json({
      success: false,
      message: authError.message || "Erro na autenticação",
    });
  }
};
