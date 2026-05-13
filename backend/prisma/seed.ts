import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Placeholder RUTs — reemplazar con RUTs reales antes de producción
const mkRut = (n: number) => `00.000.${String(n).padStart(3, "0")}-K`;

async function main() {
  console.log("Sembrando datos ALR — Alto Las Rastras...");

  // ── Usuarios ──────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("admin123", 10);
  const boardHash = await bcrypt.hash("board123", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@alr.cl" },
    update: {},
    create: { email: "admin@alr.cl", passwordHash: adminHash, nombre: "Administrador ALR", rol: "admin" },
  });
  await prisma.usuario.upsert({
    where: { email: "directiva@alr.cl" },
    update: {},
    create: { email: "directiva@alr.cl", passwordHash: boardHash, nombre: "Junta Directiva", rol: "board" },
  });

  // ── Arrendatarios ─────────────────────────────────────────────────────────
  const arrendatariosData = [
    { n:  1, razonSocial: "INMOBILIARIA TAVELLI S.A.",                   nombreComercial: "Tavelli" },
    { n:  2, razonSocial: "SOC. GOURMET TALCA SPA",                      nombreComercial: "Niguiri Sushi" },
    { n:  3, razonSocial: "RESTAURANT BOCACCIO SPA",                     nombreComercial: "Bocaccio" },
    { n:  4, razonSocial: "HB HERMANOS SPA",                             nombreComercial: "Otto Burger" },
    { n:  5, razonSocial: "SOC. GASTRONÓMICA FRANERÍA LTDA",             nombreComercial: "Fuegos de Raidho" },
    { n:  6, razonSocial: "MORAGA Y SOCIOS LTDA",                        nombreComercial: "Marcela Moraga" },
    { n:  7, razonSocial: "LO DE JULIO RESTAURANTE SPA",                 nombreComercial: "Lo de Julio" },
    { n:  8, razonSocial: "FARMACIAS CRUZ VERDE SPA",                    nombreComercial: "Cruz Verde" },
    { n:  9, razonSocial: "PIZARRO Y QUEZADA SPA",                       nombreComercial: "Red Óptica" },
    { n: 10, razonSocial: "COMERCIAL LA FRANCESA LTDA",                  nombreComercial: "La Francesa" },
    { n: 11, razonSocial: "LABRÍN Y CÍA LTDA",                           nombreComercial: "Labrín" },
    { n: 12, razonSocial: "INVERSIONES JM SPA",                          nombreComercial: "Casa Avenida" },
    { n: 13, razonSocial: "JOHANNES Y SÁNCHEZ SPA",                      nombreComercial: "Arrow" },
    { n: 14, razonSocial: "ADVENTURE SPA",                               nombreComercial: "Head" },
    { n: 15, razonSocial: "CLÍNICA UCM",                                 nombreComercial: "Clínica UCM" },
    { n: 16, razonSocial: "RJ SPA",                                      nombreComercial: "RJ" },
    { n: 17, razonSocial: "GARRIDO Y MIRANDA SPA",                       nombreComercial: "Punto Talca" },
    { n: 18, razonSocial: "ECOHOMY SPA",                                 nombreComercial: "Andrali Zapatería" },
    { n: 19, razonSocial: "SOC. COMERCIAL QUE KAWAII SPA",               nombreComercial: "Que Kawaii" },
    { n: 20, razonSocial: "IMP. Y COMERC. FIGUEROA TOLEDO LTDA",         nombreComercial: "Carolina Meyer" },
    { n: 21, razonSocial: "RAMONA CAFÉ SPA",                             nombreComercial: "Ramona Café" },
    { n: 22, razonSocial: "FERVAL",                                      nombreComercial: "Ferval" },
    { n: 23, razonSocial: "BOLÍGRAFO SPA",                               nombreComercial: "Bolígrafo" },
    { n: 24, razonSocial: "SOC. DE INVERSIONES PRISMA SPA",              nombreComercial: "Prisma" },
    { n: 25, razonSocial: "PASAMANOS SPA",                               nombreComercial: "Pasamanos" },
    { n: 26, razonSocial: "I. MUNICIPALIDAD DE TALCA",                   nombreComercial: "Depto. Tránsito" },
    { n: 27, razonSocial: "EST. Y KINESIOL. CENTRO LAS RASTRAS SPA",     nombreComercial: "Est. Las Rastras" },
    { n: 28, razonSocial: "MAFEL CHILE SPA",                             nombreComercial: "Mafel" },
    { n: 29, razonSocial: "EDITORIAL Y LIBRERÍA QUANTUM LIBROS SPA",     nombreComercial: "Librería Que Leo" },
    { n: 30, razonSocial: "IMPORTADORA MARÍA GRACIA SPA",                nombreComercial: "María Gracia" },
    { n: 31, razonSocial: "MORIS LIFE IN BALANCE SPA",                   nombreComercial: "Moris" },
    { n: 32, razonSocial: "ONE SPA",                                     nombreComercial: "One" },
    { n: 33, razonSocial: "ASIS KINESIOLOGÍA Y SALUD LTDA",              nombreComercial: "Asis" },
    { n: 34, razonSocial: "COMERCIALIZADORA HOPE BAKERY CHILE SPA",      nombreComercial: "Hope Bakery" },
    { n: 35, razonSocial: "MILA FRUTOS Y VERDURAS SPA",                  nombreComercial: "Mila" },
    { n: 36, razonSocial: "TAVOLA SPA",                                  nombreComercial: "Papas Fritas" },
    { n: 37, razonSocial: "INVEEC TRADING SPA",                          nombreComercial: "Savor Brasil" },
    { n: 38, razonSocial: "AIRAUCO CÍA LTDA",                            nombreComercial: "Aira Cookie Lab" },
    { n: 39, razonSocial: "BLOSSOM SPA",                                 nombreComercial: "Blossom" },
    { n: 40, razonSocial: "BY ZOZO SPA",                                 nombreComercial: "Marola" },
    { n: 41, razonSocial: "COMERCIAL R Y R SPA",                         nombreComercial: "Tubbak Tabaquería" },
    { n: 42, razonSocial: "COMERCIAL TAVOLA SPA",                        nombreComercial: "Tavola" },
  ];

  const arrMap: Record<string, string> = {}; // razonSocial → id
  for (const a of arrendatariosData) {
    const rut = mkRut(a.n);
    const rec = await prisma.arrendatario.upsert({
      where: { rut },
      update: {},
      create: {
        rut,
        razonSocial: a.razonSocial,
        nombreComercial: a.nombreComercial,
        email: `contacto-${String(a.n).padStart(2, "0")}@pendiente.alr.cl`,
      },
    });
    arrMap[a.razonSocial] = rec.id;
  }

  // ── Tarifas de categoría (valores de referencia) ──────────────────────────
  const vigCat = new Date("2024-01-01");
  for (const t of [
    { categoria: "PISO_1",    ufM2Arriendo: 0.600, ufM2Gc: 0.200 },
    { categoria: "PISO_2",    ufM2Arriendo: 0.550, ufM2Gc: 0.185 },
    { categoria: "MERCADITO", ufM2Arriendo: 1.100, ufM2Gc: 0.100 },
  ]) {
    await prisma.tarifaCategoria.upsert({
      where: { categoria_vigenciaDesde: { categoria: t.categoria, vigenciaDesde: vigCat } },
      update: {},
      create: { ...t, vigenciaDesde: vigCat },
    });
  }

  // ── Tarifa del mes actual ─────────────────────────────────────────────────
  const mes = new Date().toISOString().slice(0, 7);
  await prisma.tarifa.upsert({
    where: { mes },
    update: {},
    create: { mes, valorUf: 37500, iva: 0.19, precioKwh: 125, precioM3Agua: 2600, toleranciaPago: 1000 },
  });

  // ── Locales + contratos ───────────────────────────────────────────────────
  const vigContrato = new Date("2024-01-01");

  type LocalDef = {
    codigo: string;
    nombre?: string;
    m2: number;
    categoria: string;
    piso: string;
    estado: string;
    arr?: string;   // razonSocial del arrendatario
    ufArr?: number; // ufM2Arriendo  (0 = VPM/VMM/sin cobros — ajustar manualmente)
    ufGc?: number;  // ufM2Gc
  };

  const locales: LocalDef[] = [
    // ════════════════════════ PISO 1 ════════════════════════
    // L101: arriendo VPM 8,5% ventas — ufArr=0, requiere ajuste manual
    { codigo: "L101",     nombre: "Tavelli",           m2: 113.68, categoria: "PISO_1", piso: "1", estado: "activo", arr: "INMOBILIARIA TAVELLI S.A.",               ufArr: 0,     ufGc: 0.200 },
    { codigo: "L102A",    nombre: "Niguiri Sushi",      m2:  41.36, categoria: "PISO_1", piso: "1", estado: "activo", arr: "SOC. GOURMET TALCA SPA",                  ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L102B",    nombre: "Bocaccio",           m2:  47.65, categoria: "PISO_1", piso: "1", estado: "activo", arr: "RESTAURANT BOCACCIO SPA",                 ufArr: 0.500, ufGc: 0.200 },
    { codigo: "L102C",                                  m2:  46.66, categoria: "PISO_1", piso: "1", estado: "vacio" },
    { codigo: "L102D",    nombre: "Otto Burger",        m2:  49.16, categoria: "PISO_1", piso: "1", estado: "activo", arr: "HB HERMANOS SPA",                         ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L103",                                   m2: 128.70, categoria: "PISO_1", piso: "1", estado: "vacio" },
    { codigo: "L104",     nombre: "Fuegos de Raidho",   m2: 304.68, categoria: "PISO_1", piso: "1", estado: "activo", arr: "SOC. GASTRONÓMICA FRANERÍA LTDA",         ufArr: 0.500, ufGc: 0.200 },
    // L105A,C,D ocupan unidad conjunta de 105,03 m²
    { codigo: "L105ACD",  nombre: "Marcela Moraga",     m2: 105.03, categoria: "PISO_1", piso: "1", estado: "activo", arr: "MORAGA Y SOCIOS LTDA",                    ufArr: 0.500, ufGc: 0.200 },
    { codigo: "L105B",    nombre: "Lo de Julio",        m2: 107.64, categoria: "PISO_1", piso: "1", estado: "activo", arr: "LO DE JULIO RESTAURANTE SPA",             ufArr: 0.500, ufGc: 0.200 },
    // L106: VMM (Venta Mínima Mensual) — ufArr=0, requiere ajuste manual
    { codigo: "L106",     nombre: "Cruz Verde",         m2: 170.60, categoria: "PISO_1", piso: "1", estado: "activo", arr: "FARMACIAS CRUZ VERDE SPA",                ufArr: 0,     ufGc: 0.200 },
    { codigo: "L109",     nombre: "Red Óptica",         m2:  37.32, categoria: "PISO_1", piso: "1", estado: "activo", arr: "PIZARRO Y QUEZADA SPA",                   ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L110",     nombre: "La Francesa",        m2:  40.00, categoria: "PISO_1", piso: "1", estado: "activo", arr: "COMERCIAL LA FRANCESA LTDA",              ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L111-114", nombre: "Labrín",             m2: 173.77, categoria: "PISO_1", piso: "1", estado: "activo", arr: "LABRÍN Y CÍA LTDA",                       ufArr: 0.500, ufGc: 0.100 },
    { codigo: "L115",     nombre: "Casa Avenida",       m2:  52.03, categoria: "PISO_1", piso: "1", estado: "activo", arr: "INVERSIONES JM SPA",                      ufArr: 0.500, ufGc: 0.200 },
    { codigo: "L116",     nombre: "Arrow",              m2:  52.29, categoria: "PISO_1", piso: "1", estado: "activo", arr: "JOHANNES Y SÁNCHEZ SPA",                  ufArr: 0.650, ufGc: 0.200 },
    { codigo: "L117",     nombre: "Head",               m2:  55.65, categoria: "PISO_1", piso: "1", estado: "activo", arr: "ADVENTURE SPA",                           ufArr: 0.800, ufGc: 0.200 },
    { codigo: "L118-119", nombre: "Clínica UCM",        m2: 122.00, categoria: "PISO_1", piso: "1", estado: "activo", arr: "CLÍNICA UCM",                             ufArr: 0.600, ufGc: 0.200 },
    // L121A: Renta fija, GC Fija — ufArr/ufGc=0, requiere ajuste manual
    { codigo: "L121A",    nombre: "Holy Market",        m2: 170.00, categoria: "PISO_1", piso: "1", estado: "activo", arr: "RJ SPA",                                  ufArr: 0,     ufGc: 0 },
    { codigo: "L121B",    nombre: "Punto Talca",        m2:  33.38, categoria: "PISO_1", piso: "1", estado: "activo", arr: "GARRIDO Y MIRANDA SPA",                   ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L121C",    nombre: "Andrali Zapatería",  m2:  35.02, categoria: "PISO_1", piso: "1", estado: "activo", arr: "ECOHOMY SPA",                             ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L121D",    nombre: "Reserva Magna",      m2:  38.08, categoria: "PISO_1", piso: "1", estado: "activo", arr: "RJ SPA",                                  ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L122",     nombre: "Que Kawaii",         m2:  30.21, categoria: "PISO_1", piso: "1", estado: "activo", arr: "SOC. COMERCIAL QUE KAWAII SPA",            ufArr: 0.700, ufGc: 0.200 },
    { codigo: "L123",     nombre: "Galería de Arte",    m2:  30.21, categoria: "PISO_1", piso: "1", estado: "vacio" }, // sin contrato
    { codigo: "L124",     nombre: "Carolina Meyer",     m2:  32.86, categoria: "PISO_1", piso: "1", estado: "activo", arr: "IMP. Y COMERC. FIGUEROA TOLEDO LTDA",     ufArr: 0.700, ufGc: 0.200 },
    // L125: tiene terraza (tasa 0,250 UF/m²) — ingresar m²Terraza manualmente
    { codigo: "L125",     nombre: "Ramona Café",        m2:  63.21, categoria: "PISO_1", piso: "1", estado: "activo", arr: "RAMONA CAFÉ SPA",                         ufArr: 0.500, ufGc: 0.200 },

    // ════════════════════════ PISO 2 ════════════════════════
    // L105E: sin cobros
    { codigo: "L105E",    nombre: "Ferval",             m2: 125.46, categoria: "PISO_2", piso: "2", estado: "activo", arr: "FERVAL",                                  ufArr: 0,     ufGc: 0 },
    { codigo: "L201",     nombre: "Bolígrafo",          m2:  52.04, categoria: "PISO_2", piso: "2", estado: "activo", arr: "BOLÍGRAFO SPA",                           ufArr: 0.550, ufGc: 0.200 },
    { codigo: "L202",     nombre: "Prisma",             m2:  34.28, categoria: "PISO_2", piso: "2", estado: "activo", arr: "SOC. DE INVERSIONES PRISMA SPA",          ufArr: 0.600, ufGc: 0.200 },
    { codigo: "L203",     nombre: "Pasamanos",          m2:  36.62, categoria: "PISO_2", piso: "2", estado: "activo", arr: "PASAMANOS SPA",                           ufArr: 0.500, ufGc: 0.200 },
    // L204-205: Municipalidad de Talca, sin cobros
    { codigo: "L204-205", nombre: "Depto. Tránsito",    m2:  73.01, categoria: "PISO_2", piso: "2", estado: "activo", arr: "I. MUNICIPALIDAD DE TALCA",               ufArr: 0,     ufGc: 0 },
    { codigo: "L206",                                   m2:  34.48, categoria: "PISO_2", piso: "2", estado: "vacio" },
    { codigo: "L207-208", nombre: "Est. Las Rastras",   m2:  74.88, categoria: "PISO_2", piso: "2", estado: "activo", arr: "EST. Y KINESIOL. CENTRO LAS RASTRAS SPA", ufArr: 0.600, ufGc: 0.200 },
    { codigo: "L209",     nombre: "Pixel",              m2:  36.76, categoria: "PISO_2", piso: "2", estado: "activo", arr: "MAFEL CHILE SPA",                         ufArr: 0.500, ufGc: 0.200 },
    { codigo: "L210",     nombre: "Librería Que Leo",   m2:  34.48, categoria: "PISO_2", piso: "2", estado: "activo", arr: "EDITORIAL Y LIBRERÍA QUANTUM LIBROS SPA", ufArr: 0.600, ufGc: 0.200 },
    { codigo: "L211",     nombre: "María Gracia",       m2:  34.82, categoria: "PISO_2", piso: "2", estado: "activo", arr: "IMPORTADORA MARÍA GRACIA SPA",             ufArr: 0.600, ufGc: 0.200 },
    { codigo: "L212",                                   m2:  34.53, categoria: "PISO_2", piso: "2", estado: "vacio" },
    { codigo: "L213-214", nombre: "Moris",              m2:  77.56, categoria: "PISO_2", piso: "2", estado: "activo", arr: "MORIS LIFE IN BALANCE SPA",               ufArr: 0.500, ufGc: 0.150 },
    { codigo: "L215-216", nombre: "Moris",              m2: 203.42, categoria: "PISO_2", piso: "2", estado: "activo", arr: "MORIS LIFE IN BALANCE SPA",               ufArr: 0.500, ufGc: 0.150 },
    { codigo: "L217",     nombre: "One",                m2: 268.44, categoria: "PISO_2", piso: "2", estado: "activo", arr: "ONE SPA",                                 ufArr: 0.500, ufGc: 0.200 },
    { codigo: "L218-219", nombre: "Asis",               m2:  66.14, categoria: "PISO_2", piso: "2", estado: "activo", arr: "ASIS KINESIOLOGÍA Y SALUD LTDA",          ufArr: 0.600, ufGc: 0.200 },
    { codigo: "L220",                                   m2:  33.81, categoria: "PISO_2", piso: "2", estado: "vacio" },
    { codigo: "L221",                                   m2:  36.33, categoria: "PISO_2", piso: "2", estado: "vacio" },
    { codigo: "L222-226",                               m2: 248.36, categoria: "PISO_2", piso: "2", estado: "vacio" },

    // ════════════════════════ MERCADITO (L120) ════════════════════════
    { codigo: "L120A",    nombre: "Hope Bakery",        m2:  16.11, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "COMERCIALIZADORA HOPE BAKERY CHILE SPA", ufArr: 1.186, ufGc: 0.099 },
    { codigo: "L120B",    nombre: "Mila Verdulería",    m2:  15.81, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "MILA FRUTOS Y VERDURAS SPA",              ufArr: 1.208, ufGc: 0.101 },
    { codigo: "L120C",    nombre: "Rincón Parrillero",  m2:  45.66, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "RJ SPA",                                  ufArr: 1.005, ufGc: 0.035 },
    { codigo: "L120D",    nombre: "Papas Fritas",       m2:  23.04, categoria: "MERCADITO", piso: "1", estado: "vacio" }, // contrato por firmar — TAVOLA SPA
    { codigo: "L120E",    nombre: "Mafel Nuts",         m2:  23.04, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "MAFEL CHILE SPA",                         ufArr: 1.050, ufGc: 0.069 },
    { codigo: "L120F",    nombre: "Savor Brasil",       m2:  17.95, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "INVEEC TRADING SPA",                       ufArr: 1.136, ufGc: 0.089 },
    { codigo: "L120G",    nombre: "Aira Cookie Lab",    m2:  12.60, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "AIRAUCO CÍA LTDA",                         ufArr: 0.992, ufGc: 0.127 },
    { codigo: "L120H",    nombre: "Blossom",            m2:   8.75, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "BLOSSOM SPA",                              ufArr: 1.314, ufGc: 0.183 },
    { codigo: "L120I",    nombre: "Mila Mote",          m2:   7.50, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "MILA FRUTOS Y VERDURAS SPA",               ufArr: 1.533, ufGc: 0.213 },
    { codigo: "L120J",    nombre: "Tavola",             m2:  30.00, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "COMERCIAL TAVOLA SPA",                     ufArr: 1.267, ufGc: 0.053 },
    { codigo: "L120K",    nombre: "Marola",             m2:  30.00, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "BY ZOZO SPA",                              ufArr: 1.267, ufGc: 0.053 },
    { codigo: "L120L",    nombre: "Tubbak Tabaquería",  m2:  18.50, categoria: "MERCADITO", piso: "1", estado: "activo", arr: "COMERCIAL R Y R SPA",                      ufArr: 1.027, ufGc: 0.173 },
  ];

  for (const l of locales) {
    const rec = await prisma.local.upsert({
      where: { codigo: l.codigo },
      update: { nombre: l.nombre, m2: l.m2, categoria: l.categoria, piso: l.piso, estado: l.estado },
      create: { codigo: l.codigo, nombre: l.nombre, m2: l.m2, categoria: l.categoria, piso: l.piso, estado: l.estado },
    });

    if (l.arr && l.ufArr !== undefined && l.ufGc !== undefined) {
      const arrendatarioId = arrMap[l.arr];
      if (!arrendatarioId) {
        console.warn(`⚠️  Arrendatario no encontrado: ${l.arr}`);
        continue;
      }
      const existing = await prisma.contrato.findFirst({ where: { localId: rec.id, activo: true } });
      if (!existing) {
        await prisma.contrato.create({
          data: { localId: rec.id, arrendatarioId, ufM2Arriendo: l.ufArr, ufM2Gc: l.ufGc, vigenciaDesde: vigContrato },
        });
      }
    }
  }

  const activos  = locales.filter((l) => l.estado === "activo").length;
  const vacios   = locales.filter((l) => l.estado === "vacio").length;
  const contratos = locales.filter((l) => l.arr).length;

  console.log("✅ Seed ALR completado");
  console.log(`   ${locales.length} locales (${activos} activos, ${vacios} disponibles)`);
  console.log(`   ${arrendatariosData.length} arrendatarios`);
  console.log(`   ${contratos} contratos`);
  console.log("   ⚠️  RUTs son placeholders — actualizar antes de producción");
  console.log("   ⚠️  L101 (VPM) y L106 (VMM) tienen ufM2Arriendo=0 — ajustar manualmente");
  console.log("   admin@alr.cl / admin123");
  console.log("   directiva@alr.cl / board123");
}

main().catch(console.error).finally(() => prisma.$disconnect());
