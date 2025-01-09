import { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?:
        | {
            userId: string;
            role: "USER" | "PROMOTER" | "ADMIN";
            promoter: boolean;
          }
        | JwtPayload;
    }
  }
}
