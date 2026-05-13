export interface InputCalculadora {
  m2: number;
  ufM2Arriendo: number;
  ufM2Gc: number;
  valorUf: number;
  kwh: number;
  precioKwh: number;
  m3Agua: number;
  precioM3Agua: number;
  multas: number;
  descuentos: number;
  saldoAnterior: number;
  iva: number; // fracción, ej. 0.19
  esLocalVacio?: boolean;
  propietarioGcMonto?: number; // GC que paga el dueño si local vacío
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

export interface ResultadoFactura {
  items: ItemsFactura;
  subtotal: number;
  ivaAmount: number;
  total: number;
}

export function calcularFactura(input: InputCalculadora): ResultadoFactura {
  const arriendo = input.esLocalVacio
    ? 0
    : redondear(input.m2 * input.ufM2Arriendo * input.valorUf);

  const gastosComunales = input.esLocalVacio
    ? redondear(input.propietarioGcMonto ?? input.m2 * input.ufM2Gc * input.valorUf)
    : redondear(input.m2 * input.ufM2Gc * input.valorUf);

  const luz = redondear(input.kwh * input.precioKwh);
  const agua = redondear(input.m3Agua * input.precioM3Agua);
  const multas = redondear(input.multas);
  const descuentos = redondear(input.descuentos);
  const saldoAnterior = redondear(input.saldoAnterior);

  const subtotal = redondear(
    arriendo + gastosComunales + luz + agua + multas - descuentos + saldoAnterior,
  );
  const ivaAmount = redondear(subtotal * input.iva);
  const total = redondear(subtotal + ivaAmount);

  return {
    items: { arriendo, gastosComunales, luz, agua, multas, descuentos, saldoAnterior },
    subtotal,
    ivaAmount,
    total,
  };
}

export interface InputPagoParaMatch {
  montoFactura: number;
  montoPago: number;
  tolerancia: number;
}

export type ResultadoMatch = "exacto" | "tolerancia" | "sin_match";

export function evaluarMatch(input: InputPagoParaMatch): ResultadoMatch {
  const diferencia = Math.abs(input.montoFactura - input.montoPago);
  if (diferencia === 0) return "exacto";
  if (diferencia <= input.tolerancia) return "tolerancia";
  return "sin_match";
}

export function calcularSaldoPendiente(totalFactura: number, pagosParciales: number[]): number {
  const totalPagado = pagosParciales.reduce((sum, p) => sum + p, 0);
  return redondear(Math.max(0, totalFactura - totalPagado));
}

export function detectarAnomaliaConsumo(
  consumoActual: number,
  consumoPromedioHistorico: number,
  umbralPorcentaje = 0.3,
): boolean {
  if (consumoPromedioHistorico === 0) return false;
  const variacion = Math.abs(consumoActual - consumoPromedioHistorico) / consumoPromedioHistorico;
  return variacion > umbralPorcentaje;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
