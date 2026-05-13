import { Response, NextFunction } from "express";
import { AuthRequest, JwtPayload, Rol } from "../types/index.js";

export function mockAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  req.user = { userId: "poc-admin", email: "admin@alr.cl", rol: "admin" };
  next();
}

// Backwards compat for existing route imports
export const autenticar = mockAuth;
export function autorizar(..._roles: Rol[]) {
  return (_req: AuthRequest, _res: Response, next: NextFunction) => next();
}
export function generarToken(_payload: JwtPayload): string { return "poc-token"; }
