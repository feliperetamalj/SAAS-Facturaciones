# Handoff · Sistema de Facturación · Centro Comercial Alto Las Rastras (ALR)

> Paquete de entrega para implementar el sistema en código real (Claude Code u otro).

---

## ⚠️ IMPORTANTE — leer antes de empezar

Los archivos en `wireframes/` son **referencias de diseño creadas en HTML** — prototipos que muestran la apariencia y el comportamiento deseados. **NO son código de producción para copiar directamente.**

La tarea es **recrear estos diseños en un proyecto real**, usando un stack moderno (recomendado abajo) con sus librerías y patrones establecidos. Los HTML sirven para entender layout, jerarquía, flujo y comportamiento — el styling final puede (y debe) usar el design system del proyecto destino.

**Fidelidad: mid-fi (wireframes con jerarquía visual).** Estructura, layouts y flujos están definidos. Colores y tipografía son sugerentes, no finales — el equipo puede ajustar la paleta al brand de Alto Las Rastras cuando esté disponible.

---

## 1. Overview del producto

Sistema web (responsive: escritorio + móvil) para automatizar la **facturación mensual** de los ~47 locales comerciales del Centro Comercial **Alto Las Rastras (ALR)**.

**Core del negocio:**
- Cada local paga 4 conceptos mensuales: **arriendo**, **gastos comunes (GC)**, **luz**, **agua**, más posibles multas, descuentos, saldo anterior e IVA.
- Arriendo y GC se calculan como `m² × UF/m² × valor_UF`.
- Luz: lectura de medidor → `kWh × $/kWh`. El Excel llega **automáticamente cada mes** desde el medidor general.
- Agua: lectura manual del admin → `m³ × $/m³`. El admin **sube un Excel manualmente**.

**3 roles con vistas distintas:**

| Rol | Permisos | Caso de uso |
|---|---|---|
| **Administrador** | CRUD completo + acciones | Operación día a día |
| **Arrendatario** | Solo lectura, **solo su local** | Ver/pagar su factura |
| **Junta Directiva / GG** | Solo lectura, **vista global** | Reporting ejecutivo |

---

## 2. Stack recomendado

> Estas son sugerencias; el equipo puede sustituir por equivalentes.

- **Frontend**: React 18 + TypeScript + Vite (o Next.js si prefieren SSR/routing por archivos)
- **Estilos**: Tailwind CSS + shadcn/ui (componentes accesibles, cabe en mid-fi)
- **Charts**: Recharts o Tremor
- **Backend**: Node.js + Fastify o NestJS · alternativamente Python + FastAPI
- **DB**: PostgreSQL (modelo en sección 7)
- **Auth**: roles `admin`, `tenant`, `board` con un middleware claro
- **Storage**: S3-compatible para PDFs de facturas y comprobantes
- **Cola/jobs**: BullMQ o equivalente para envío masivo + parser de comprobantes
- **PDF**: `pdfkit`, `puppeteer` o servicio externo para boletas/facturas (en Chile: integración SII para DTE)
- **Mensajería**: SMTP (admin lo configura) + WhatsApp Business API (Twilio/Meta) para envío de facturas
- **OCR comprobantes**: Google Document AI, AWS Textract, o servicio chileno equivalente

---

## 3. Pantallas / Vistas — inventario completo

Cada pantalla está en `wireframes/`. Los IDs corresponden a los `<DCArtboard id>` dentro de `Wireframes Facturacion ALR.html`.

### 3.0 Mapa general del sistema (`flow-map`)
Documentación del flujo de datos. **No es una pantalla de UI** — sirve para que el dev entienda la arquitectura.

### 3.1 Vista Administrador

**3.1.A · Dashboard variante A** (`admin-a`) — Sidebar clásico + KPIs + tabla densa
- Layout: sidebar 200px + content fluido
- KPIs (4): Facturado, Cobrado, Mora, Locales activos
- Charts: línea ingresos vs gastos (12m), donut estado del lote del mes
- Tabla: 47 locales con filtros (Todos / Mora / Pagado), columnas: Local, Arrendatario, m², Arriendo, GC, Luz, Agua, Total, Estado, Acciones
- **Recomendado para implementar primero** (es el más completo y operacional)

**3.1.B · Dashboard variante B** (`admin-b`) — Topnav + ciclo de mes en 5 pasos
- Para usuarios que prefieren UX guiada
- Hero status muestra dónde está el ciclo del mes
- 5 steps: Importar Luz → Importar Agua → Revisar tarifas → Generar lote → Enviar

**3.1.C · Dashboard variante C** (`admin-c`) — Comando central, 3 columnas
- Para usuarios power: timeline de actividad en vivo + cola de conciliación + variables del mes
- Útil como "modo monitor" en pantalla grande

> **Decisión a tomar**: cuál de las 3 implementar. Sugerimos A como base y agregar el "ciclo de 5 pasos" de B como banner superior cuando el ciclo está activo.

**3.1.D · Importar Excel** (`aux-import`)
- Dos cards lado a lado: Luz (auto, muestra último archivo recibido) + Agua (drag-and-drop)
- Vista previa de lecturas con detección de anomalías (consumo +30% vs promedio histórico → flag)
- Botones: Cancelar / Marcar todas revisadas / Aplicar al ciclo

**3.1.E · Generar lote (wizard)** (`aux-batch`)
- Modal centrado con checklist de pre-condiciones (UF, lecturas, saldo anterior, tarifas)
- Resumen: # facturas, total bruto, IVA, saldo arrastrado
- Opciones post-generación: enviar mail, enviar WhatsApp, avisar directiva

**3.1.F · Detalle de un local** (`aux-detail`)
- Header con número de local, arrendatario, badge de estado
- Card de contrato (m², UF/m², vigencia, RUT, contacto)
- Card de factura del mes con desglose
- Bar chart de 12 meses de historial
- Timeline de eventos (factura enviada, comprobante recibido, pago conciliado, etc.)

**3.1.G · Tarifas** (`aux-tarifas`)
- Variables del mes (UF, IVA, kWh, m³ agua) — UF idealmente auto-sync con SII
- UF/m² por categoría de local (Boulevard A, Boulevard B, Patio comidas, Subterráneo, Servicios)
- Simulador: "si subo kWh a $X → impacto promedio en factura"

**3.1.H · Conciliación de pagos** (`aux-pagos`)
- KPIs de auto-match (auto-conciliados, en revisión, pendientes, tasa)
- Bandeja tipo email: comprobantes entrantes con flags (monto difiere, sin RUT, baja legibilidad)
- Detalle: factura emitida vs comprobante recibido + sugerencia del sistema (parcial / aceptar / pedir aclaración)

### 3.2 Vista Arrendatario

**3.2.A · Móvil** (`tenant-mobile`) — 360×720, **diseño principal** (es donde más se usa)
- Header con logo + pill de su local + avatar
- Hero: total del mes en grande + fecha de vencimiento
- Botones primarios: Ver factura / Descargar PDF
- Card de desglose línea por línea
- Card comparativo con bar chart (últimos 6 meses) + insight ("Tu luz subió 12%")
- Acciones secundarias: Enviar comprobante / Ver historial / Reclamo
- Tabbar inferior: Factura · Historial · Reclamos · Perfil

**3.2.B · Desktop** (`tenant-desktop`)
- 2 columnas arriba: factura del mes + comparativo (KPIs vs abril, vs may 2025) con line chart 12m
- Tabla de historial abajo

### 3.3 Vista Junta Directiva (`board-1`)
- 4 KPIs ejecutivos: Ingresos, % Cobrado, Morosidad, Ocupación
- Line chart 24 meses (2026 vs 2025)
- Donut balance GC vs gastos operativos
- Ranking top 6 ingresos
- **Mapa visual de ocupación** (grid 47 locales coloreados por estado)
- Card de forecast del próximo mes con rango ±

### 3.4 Flujos detallados (`flow-monthly`, `flow-autopay`)
Diagramas de proceso. Útiles para entender **el orden temporal**, no son UI.

---

## 4. Lógica de cálculo de la factura

```
arriendo       = m² × UF_por_m²_arriendo × valor_UF
gastos_comunes = m² × UF_por_m²_GC × valor_UF
luz            = kWh × $_kWh
agua           = m³ × $_m³_agua
multas         = Σ multas_pendientes
descuentos     = Σ descuentos_aplicables
saldo_anterior = factura_mes_anterior_no_pagada (si existe)

subtotal       = arriendo + gastos_comunes + luz + agua + multas
                 - descuentos + saldo_anterior
iva            = subtotal × 0.19         (configurable)
TOTAL          = subtotal + iva
```

**Casos a manejar:**
- Local **vacío** (sin arrendatario): no se factura arriendo, pero sí GC al dueño/centro.
- **Pago parcial** del mes anterior → el delta queda como `saldo_anterior` del mes actual.
- **Anulación** de factura: requiere razón + log de auditoría + nota de crédito (DTE en Chile).
- **Multas**: aprobadas por admin, con motivo y fecha.

---

## 5. Flujos críticos (lógica de negocio)

### 5.1 Ciclo mensual (ver `flow-monthly`)
```
Día 1   · Excel luz llega solo (cron job lee buzón / API empresa eléctrica)
Día 2-3 · Admin lee medidores agua en terreno
Día 4   · Admin sube Excel agua → sistema valida → flagea anomalías
Día 4   · Admin confirma tarifas (UF auto desde SII)
Día 5   · Admin clickea "Generar lote" → wizard checklist
Día 5   · Sistema genera N facturas (DTE) → envía mail + WhatsApp
Día 6-15 · Llegan comprobantes → conciliador automático
Día 16  · Sistema genera avisos de mora a no-pagadores
Día 30  · Reporte automático a la directiva
```

### 5.2 Auto-conciliación de pagos (ver `flow-autopay`)
```
1. Arrendatario envía comprobante a pagos@alr.cl o por la app
2. Buzón recibe → extractor (OCR + parser) saca: RUT, monto, fecha, referencia
3. Matcher busca factura abierta del mismo RUT con ese monto
4. Decisión:
   ├── Match exacto → marca pagada + notifica al arrendatario
   ├── Tolerancia ±$X (configurable, ej. ±$1.000) → match parcial automático
   └── Sin match claro → cola de revisión del admin
5. Vistas se actualizan en tiempo real (arrendatario ve "pagado", directiva ve KPI subir)
```

**Decisión pendiente**: tolerancia automática (¿$0?, ¿$1.000?, ¿0.5%?). Recomendamos hacer esto **configurable** en la pantalla de Tarifas.

---

## 6. State / Estado de las facturas

```
borrador → emitida → enviada → (parcial) → pagada
                              ↘ vencida → mora → recuperada/incobrable
                  ↘ anulada (requiere nota de crédito)
```

Cada transición debe generar un evento en el log de auditoría (quién, cuándo, qué cambió).

---

## 7. Modelo de datos sugerido (PostgreSQL)

```sql
-- Catálogo
locales (id, codigo, m2, categoria, estado, ...)
arrendatarios (id, rut, razon_social, email, telefono, ...)
contratos (id, local_id, arrendatario_id, uf_m2_arriendo, uf_m2_gc,
           vigencia_desde, vigencia_hasta, descuentos_json, ...)

-- Tarifas / parámetros
tarifas (id, mes, valor_uf, iva, kwh, m3_agua, tolerancia_pago)
tarifas_categoria (id, categoria, uf_m2_arriendo, uf_m2_gc, vigencia_desde)

-- Lecturas
lecturas_luz (id, local_id, mes, lectura_anterior, lectura_actual, kwh, fuente)
lecturas_agua (id, local_id, mes, lectura_anterior, lectura_actual, m3, fuente)

-- Facturación
facturas (id, local_id, mes, contrato_snapshot_jsonb, items_jsonb,
          subtotal, iva, total, saldo_anterior, estado, dte_folio,
          pdf_url, generada_at, enviada_at, vencimiento, ...)
factura_eventos (id, factura_id, tipo, payload, actor, at)
multas (id, local_id, mes, motivo, monto, aprobada_por)

-- Pagos
comprobantes (id, fuente_email, raw_attachment_url, ocr_jsonb,
              rut_detectado, monto_detectado, fecha_detectada, recibido_at)
pagos (id, factura_id, comprobante_id, monto, modo_match,
       conciliado_at, conciliado_por)

-- Auditoría
auditoria (id, actor, rol, accion, recurso, antes_jsonb, despues_jsonb, at)
```

**Detalle clave**: las facturas guardan un **snapshot** del contrato y de los items en JSONB, así editar el contrato luego no muta facturas históricas.

---

## 8. APIs / Endpoints sugeridos

```
# Admin
POST  /api/admin/lecturas/luz/import       (excel upload o webhook auto)
POST  /api/admin/lecturas/agua/import
GET   /api/admin/ciclo/:mes/preview        (qué se va a facturar)
POST  /api/admin/ciclo/:mes/generar        (crea borradores)
POST  /api/admin/ciclo/:mes/enviar         (envía mail+WApp)
GET   /api/admin/locales
PUT   /api/admin/locales/:id
GET   /api/admin/tarifas
PUT   /api/admin/tarifas/:mes
GET   /api/admin/conciliacion/cola
POST  /api/admin/conciliacion/:id/aprobar
POST  /api/admin/conciliacion/:id/parcial
POST  /api/admin/facturas/:id/anular

# Webhook
POST  /webhooks/comprobante                (mail server o form de la app)

# Arrendatario
GET   /api/tenant/factura/actual
GET   /api/tenant/facturas?mes=...
GET   /api/tenant/facturas/:id/pdf
GET   /api/tenant/comparativo/:mes
POST  /api/tenant/comprobante              (subir comprobante)
POST  /api/tenant/reclamo

# Directiva
GET   /api/board/kpis/:mes
GET   /api/board/ranking/:mes
GET   /api/board/ocupacion
GET   /api/board/forecast
GET   /api/board/exportar/:formato         (pdf/excel)
```

Todos respetan el rol via middleware. Arrendatario solo accede a su `local_id`.

---

## 9. Tokens de diseño (mid-fi sugerentes)

> Reemplazar al integrar el brand real de ALR.

```css
--paper:        #FAF7F1   /* fondo */
--paper-2:      #F2EEE5   /* fondo secundario */
--ink:          #2A2521   /* texto principal */
--ink-2:        #6B635A   /* texto secundario */
--accent:       #4A8A95   /* azul-petróleo · primario */
--accent-soft:  #C9DEE2
--warn:         #D88864   /* coral · alertas / mora */
--warn-soft:    #F4D9CB
--ok:           #6B9A6B   /* verde · pagado */
--ok-soft:      #CCDEC8
```

**Tipografía**: Plus Jakarta Sans para UI, JetBrains Mono para datos numéricos / códigos. (En el wireframe usé Caveat para "anotaciones"; eso NO va al producto final.)

**Spacing**: escala 4/8/12/16/20/24/32. **Radio**: 6px componentes, 8-12px cards. **Border**: 1.5px sólido `--ink` para bordes destacados (estilo wireframe — en hifi probablemente quieras `1px solid neutral-200` con sombras).

---

## 10. Decisiones pendientes (para el primer kick-off con el dev)

1. ¿Qué variación de admin (A/B/C)?
2. **Columnas exactas** del Excel de luz (formato del proveedor) y del Excel de agua (template propio)
3. Tolerancia de auto-conciliación: ¿$0, monto fijo, %?
4. ¿DTE SII desde día 1 o boleta interna primero y SII después?
5. ¿WhatsApp Business obligatorio o solo email en MVP?
6. Política de mora: ¿interés? ¿desde cuándo?
7. ¿Multi-mall futuro? (afecta diseño multi-tenant)

---

## 11. Cómo usar este paquete con Claude Code

1. Descomprime este folder en tu máquina.
2. `cd` a un repo vacío (o crea uno nuevo).
3. Inicia Claude Code y dale este prompt inicial:

   > "Soy el desarrollador del sistema de facturación de Alto Las Rastras. En `./design_handoff_facturacion_alr/` tienes el README con la spec completa y en `wireframes/` los HTML de referencia visual (NO copiar, solo referencia). Por favor:
   > 1. Lee el README completo.
   > 2. Abre los HTML clave en un navegador para entender el look-and-feel.
   > 3. Propóneme un plan de implementación en fases (MVP → v1).
   > 4. Empezamos por la **Vista Administrador, variante A**, la pantalla de **Importar Excel** y el **motor de cálculo**."

4. Itera pantalla por pantalla. Pídele que implemente con tipos estrictos y tests unitarios al motor de cálculo (es el corazón crítico del sistema).

---

## 12. Archivos en este paquete

```
design_handoff_facturacion_alr/
├── README.md                                  ← este archivo
└── wireframes/
    ├── Wireframes Facturacion ALR.html        ← canvas con todas las pantallas
    ├── design-canvas.jsx                       ← componente canvas (no copiar)
    ├── wf-styles.css                           ← tokens visuales del wireframe
    ├── wf-components.jsx                       ← primitives compartidos
    ├── wf-flow.jsx                             ← mapa general del sistema
    ├── wf-admin.jsx                            ← 3 variantes dashboard admin
    ├── wf-admin-aux.jsx                        ← pantallas auxiliares admin
    ├── wf-tenant.jsx                           ← vista arrendatario (mobile + desktop)
    ├── wf-board.jsx                            ← vista junta directiva
    └── wf-flows-detail.jsx                     ← flujos paso a paso
```

Para abrir el canvas de wireframes en local: abre `Wireframes Facturacion ALR.html` directamente en el navegador. Si los `.jsx` no cargan por CORS, sirve el folder con `python3 -m http.server` y abre `http://localhost:8000/wireframes/Wireframes Facturacion ALR.html`.
