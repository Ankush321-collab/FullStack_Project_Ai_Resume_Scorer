import { Request } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-very-secret-key";

export interface AuthUser {
  id: string;
  email: string;
}

export async function authMiddleware(
  req: Request
): Promise<AuthUser | null> {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return {
      id: decoded.id,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}
