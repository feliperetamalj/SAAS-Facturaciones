import { Request } from "express";

export type Rol = "admin" | "tenant" | "board";

export interface JwtPayload {
  userId: string;
  email: string;
  rol: Rol;
  localId?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export type EstadoFactura =
  | "borrador"
  | "emitida"
  | "enviada"
  | "parcial"
  | "pagada"
  | "vencida"
  | "mora"
  | "recuperada"
  | "anulada";

export type CategoriaLocal =
  | "PISO_1"
  | "PISO_2"
  | "MERCADITO";
