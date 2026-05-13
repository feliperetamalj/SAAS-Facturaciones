import {
  calcularFactura,
  calcularSaldoPendiente,
  detectarAnomaliaConsumo,
  evaluarMatch,
} from "../src/services/calculadora";

const inputBase = {
  m2: 50,
  ufM2Arriendo: 0.1,
  ufM2Gc: 0.03,
  valorUf: 37000,
  kwh: 500,
  precioKwh: 120,
  m3Agua: 20,
  precioM3Agua: 2500,
  multas: 0,
  descuentos: 0,
  saldoAnterior: 0,
  iva: 0.19,
};

describe("calcularFactura", () => {
  test("calcula arriendo correctamente", () => {
    const r = calcularFactura(inputBase);
    // 50 * 0.1 * 37000 = 185,000
    expect(r.items.arriendo).toBe(185000);
  });

  test("calcula gastos comunes correctamente", () => {
    const r = calcularFactura(inputBase);
    // 50 * 0.03 * 37000 = 55,500
    expect(r.items.gastosComunales).toBe(55500);
  });

  test("calcula luz correctamente", () => {
    const r = calcularFactura(inputBase);
    // 500 * 120 = 60,000
    expect(r.items.luz).toBe(60000);
  });

  test("calcula agua correctamente", () => {
    const r = calcularFactura(inputBase);
    // 20 * 2500 = 50,000
    expect(r.items.agua).toBe(50000);
  });

  test("calcula subtotal correctamente (sin multas ni descuentos)", () => {
    const r = calcularFactura(inputBase);
    // 185000 + 55500 + 60000 + 50000 = 350,500
    expect(r.subtotal).toBe(350500);
  });

  test("calcula IVA correctamente", () => {
    const r = calcularFactura(inputBase);
    // 350500 * 0.19 = 66,595
    expect(r.ivaAmount).toBe(66595);
  });

  test("calcula total correctamente", () => {
    const r = calcularFactura(inputBase);
    // 350500 + 66595 = 417,095
    expect(r.total).toBe(417095);
  });

  test("aplica multas al subtotal", () => {
    const r = calcularFactura({ ...inputBase, multas: 50000 });
    expect(r.subtotal).toBe(400500);
    expect(r.items.multas).toBe(50000);
  });

  test("aplica descuentos al subtotal", () => {
    const r = calcularFactura({ ...inputBase, descuentos: 10000 });
    expect(r.subtotal).toBe(340500);
    expect(r.items.descuentos).toBe(10000);
  });

  test("incluye saldo anterior en el subtotal", () => {
    const r = calcularFactura({ ...inputBase, saldoAnterior: 100000 });
    expect(r.subtotal).toBe(450500);
    expect(r.items.saldoAnterior).toBe(100000);
  });

  test("local vacío: arriendo = 0", () => {
    const r = calcularFactura({ ...inputBase, esLocalVacio: true });
    expect(r.items.arriendo).toBe(0);
    expect(r.items.gastosComunales).toBeGreaterThan(0);
  });

  test("local vacío con monto de GC personalizado", () => {
    const r = calcularFactura({ ...inputBase, esLocalVacio: true, propietarioGcMonto: 30000 });
    expect(r.items.arriendo).toBe(0);
    expect(r.items.gastosComunales).toBe(30000);
  });
});

describe("evaluarMatch", () => {
  test("match exacto cuando montos son iguales", () => {
    expect(evaluarMatch({ montoFactura: 100000, montoPago: 100000, tolerancia: 1000 })).toBe(
      "exacto",
    );
  });

  test("match por tolerancia dentro del rango", () => {
    expect(evaluarMatch({ montoFactura: 100000, montoPago: 99500, tolerancia: 1000 })).toBe(
      "tolerancia",
    );
  });

  test("sin match cuando diferencia supera tolerancia", () => {
    expect(evaluarMatch({ montoFactura: 100000, montoPago: 95000, tolerancia: 1000 })).toBe(
      "sin_match",
    );
  });

  test("sin match con tolerancia 0 y montos distintos", () => {
    expect(evaluarMatch({ montoFactura: 100000, montoPago: 99999, tolerancia: 0 })).toBe(
      "sin_match",
    );
  });
});

describe("calcularSaldoPendiente", () => {
  test("retorna 0 si está completamente pagado", () => {
    expect(calcularSaldoPendiente(100000, [100000])).toBe(0);
  });

  test("retorna diferencia si hay pago parcial", () => {
    expect(calcularSaldoPendiente(100000, [60000])).toBe(40000);
  });

  test("retorna 0 si se paga de más (no devuelve negativo)", () => {
    expect(calcularSaldoPendiente(100000, [120000])).toBe(0);
  });

  test("suma múltiples pagos parciales", () => {
    expect(calcularSaldoPendiente(100000, [40000, 40000])).toBe(20000);
  });
});

describe("detectarAnomaliaConsumo", () => {
  test("detecta anomalía cuando consumo supera 30% del histórico", () => {
    expect(detectarAnomaliaConsumo(700, 500)).toBe(true);
  });

  test("no detecta anomalía dentro del rango normal", () => {
    expect(detectarAnomaliaConsumo(520, 500)).toBe(false);
  });

  test("no detecta anomalía si histórico es 0", () => {
    expect(detectarAnomaliaConsumo(500, 0)).toBe(false);
  });

  test("respeta umbral personalizado", () => {
    expect(detectarAnomaliaConsumo(560, 500, 0.1)).toBe(true);
    expect(detectarAnomaliaConsumo(540, 500, 0.1)).toBe(false);
  });
});
