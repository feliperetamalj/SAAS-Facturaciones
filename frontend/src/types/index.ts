export type Rol = "admin" | "tenant" | "board";

export interface User {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  localId?: string;
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
  | "BOULEVARD_A"
  | "BOULEVARD_B"
  | "PATIO_COMIDAS"
  | "SUBTERRANEO"
  | "SERVICIOS";

export interface Local {
  id: string;
  codigo: string;
  nombre?: string;
  m2: number;
  m2Terraza?: number | null;
  categoria: CategoriaLocal;
  estado: "activo" | "vacio" | "inactivo";
  piso?: string;
  contratos?: Contrato[];
}

export interface Arrendatario {
  id: string;
  rut: string;
  razonSocial: string;
  nombreComercial?: string;
  email?: string | null;
  telefono?: string;
}

export interface Contrato {
  id: string;
  localId: string;
  arrendatarioId: string;
  ufM2Arriendo: number;
  ufM2Gc: number;
  ufM2Terraza?: number | null;
  ufM2GcTerraza?: number | null;
  fondoPromo?: number | null;
  precioFijoArriendo?: number | null;
  precioFijoGc?: number | null;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  activo: boolean;
  arrendatario?: Arrendatario;
}

export interface Tarifa {
  id: string;
  mes: string;
  valorUf: number;
  iva: number;
  precioKwh: number;
  precioM3Agua: number;
  toleranciaPago: number;
}

export interface ItemsFactura {
  arriendo: number;
  gastosComunales: number;
  luz: number;
  agua: number;
  multas: number;
  descuentos: number;
  saldoAnterior: number;
}

export interface Factura {
  id: string;
  localId: string;
  mes: string;
  itemsJson: ItemsFactura;
  subtotal: number;
  iva: number;
  total: number;
  saldoAnterior: number;
  estado: EstadoFactura;
  pdfUrl?: string;
  folio?: string;
  generadaAt?: string;
  enviadaAt?: string;
  vencimiento?: string;
  local?: Local;
  pagos?: Pago[];
  eventos?: FacturaEvento[];
}

export interface FacturaEvento {
  id: string;
  tipo: string;
  payload?: unknown;
  actor: string;
  at: string;
}

export interface Pago {
  id: string;
  monto: number;
  modoMatch: string;
  conciliadoAt?: string;
}

export interface KpisDashboard {
  facturado: number;
  cobrado: number;
  mora: number;
  localesActivos: number;
}

export interface ProyeccionMes {
  arriendo: number;
  gc: number;
  total: number;
  valorUf: number;
  fuente: string;
}

export interface DashboardData {
  kpis: KpisDashboard;
  proyeccion: ProyeccionMes;
  serieIngresos: { mes: string; facturado: number }[];
  estadoLote: { estado: EstadoFactura; count: number }[];
}
