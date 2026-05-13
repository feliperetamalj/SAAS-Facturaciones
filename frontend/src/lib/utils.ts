import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { EstadoFactura } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const clp = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

export const pct = (n: number) => `${Math.round(n)}%`;

export function formatMes(mes: string): string {
  return new Date(`${mes}-01`).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL");
}

export const estadoConfig: Record<EstadoFactura, { label: string; color: string; bg: string }> = {
  borrador:   { label: "Borrador",   color: "text-ink-2",   bg: "bg-paper-2" },
  emitida:    { label: "Emitida",    color: "text-accent",  bg: "bg-accent-soft" },
  enviada:    { label: "Enviada",    color: "text-accent",  bg: "bg-accent-soft" },
  parcial:    { label: "Parcial",    color: "text-warn",    bg: "bg-warn-soft" },
  pagada:     { label: "Pagada",     color: "text-ok",      bg: "bg-ok-soft" },
  vencida:    { label: "Vencida",    color: "text-warn",    bg: "bg-warn-soft" },
  mora:       { label: "Mora",       color: "text-red-600", bg: "bg-red-50" },
  recuperada: { label: "Recuperada", color: "text-ok",      bg: "bg-ok-soft" },
  anulada:    { label: "Anulada",    color: "text-ink-2",   bg: "bg-paper-2" },
};

export const categoriaLabel: Record<string, string> = {
  PISO_1:    "Piso 1",
  PISO_2:    "Piso 2",
  MERCADITO: "Mercadito",
};
