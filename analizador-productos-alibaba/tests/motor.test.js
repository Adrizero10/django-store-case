/* Tests del motor de cálculo. Ejecutar con:  node tests/motor.test.js */
"use strict";

const assert = require("assert");
const { calcularFinanzas, calcularScore } = require("../js/motor.js");

let pasados = 0;
function test(nombre, fn) {
  try { fn(); pasados++; console.log("  ✓ " + nombre); }
  catch (err) { console.error("  ✗ " + nombre + "\n    " + err.message); process.exitCode = 1; }
}

// Caso base con números redondos y verificables a mano:
// 100 uds a 2 € FOB, flete 100, arancel 10%, IVA 21%, despacho 50, muestras 50.
function entradasBase() {
  return {
    unidades: 100, precioFobUnidad: 2, costeMuestras: 50,
    fleteTotal: 100, seguroTotal: 0, arancelPct: 10, ivaImportPct: 21,
    despachoAduanas: 50, transporteNacional: 0, ivaRecuperable: true,
    pvp: 24.2, ivaVentaPct: 21,
    comisionPlataformaPct: 0, comisionPagoPct: 0,
    envioClienteUnidad: 0, embalajeUnidad: 0, publicidadUnidad: 0,
    devolucionesPct: 0, costesFijosMes: 0, ventasMesEstimadas: 0
  };
}

console.log("Finanzas:");

test("cadena de landed cost (FOB → CIF → arancel → IVA)", () => {
  const r = calcularFinanzas(entradasBase());
  assert.strictEqual(r.valorMercancia, 200);        // 100 × 2
  assert.strictEqual(r.valorCif, 300);              // 200 + 100
  assert.strictEqual(r.arancel, 30);                // 10% de 300
  assert.strictEqual(r.ivaImportacion, 69.3);       // 21% de 330
  assert.strictEqual(r.costeAterrizadoTotal, 430);  // 300+30+50+50 (IVA recuperable)
  assert.strictEqual(r.costeAterrizadoUnidad, 4.3);
  assert.strictEqual(r.desembolsoTotal, 499.3);     // 430 + 69.3
});

test("IVA no recuperable encarece el landed cost", () => {
  const e = entradasBase();
  e.ivaRecuperable = false;
  const r = calcularFinanzas(e);
  assert.strictEqual(r.costeAterrizadoTotal, 499.3);
  assert.ok(r.costeAterrizadoUnidad > 4.3);
});

test("unit economics: margen, beneficio, ROI", () => {
  const r = calcularFinanzas(entradasBase());
  assert.strictEqual(r.ingresoNetoUnidad, 20);      // 24.20 / 1.21
  assert.strictEqual(r.beneficioUnidad, 15.7);      // 20 − 4.30
  assert.strictEqual(r.margenNetoPct, 78.5);
  assert.strictEqual(r.beneficioPedido, 1570);
  assert.strictEqual(r.roiPct, Math.round(1570 * 100 / 499.3 * 100) / 100);
});

test("comisiones y devoluciones reducen el beneficio", () => {
  const e = entradasBase();
  e.comisionPlataformaPct = 15;
  e.devolucionesPct = 10;
  const r = calcularFinanzas(e);
  assert.strictEqual(r.comisionPlataformaUnidad, 3.63);   // 15% de 24.20
  assert.strictEqual(r.costeDevolucionesUnidad, 0.43);    // 10% de 4.30
  assert.ok(r.beneficioUnidad < 15.7);
});

test("punto de equilibrio y payback", () => {
  const e = entradasBase();
  e.costesFijosMes = 157;
  e.ventasMesEstimadas = 20;
  const r = calcularFinanzas(e);
  assert.strictEqual(r.puntoEquilibrioUds, 10);           // ceil(157 / 15.70)
  assert.strictEqual(r.paybackMeses, Math.round(499.3 / 157 * 100) / 100);
});

test("producto que pierde dinero avisa", () => {
  const e = entradasBase();
  e.pvp = 4;
  const r = calcularFinanzas(e);
  assert.ok(r.beneficioUnidad < 0);
  assert.ok(r.avisos.some(a => a.includes("Pierdes dinero")));
});

test("aviso de regla 3x", () => {
  const e = entradasBase();
  e.pvp = 6; // neto ~4.96 < 3 × FOB(2)
  const r = calcularFinanzas(e);
  assert.ok(r.avisos.some(a => a.includes("regla 3x")));
});

test("entradas vacías no rompen el cálculo", () => {
  const r = calcularFinanzas({});
  assert.strictEqual(r.costeAterrizadoUnidad, 0);
  assert.strictEqual(r.beneficioUnidad, 0);
});

console.log("Scoring:");

test("cotas del score: mejor caso 100, peor caso 0", () => {
  const mejor = calcularScore({ demanda: 10, competencia: 0, tendencia: 10,
    estacionalidad: 0, dificultadLogistica: 0, riesgoRegulatorio: 0, margenNetoPct: 40 });
  const peor = calcularScore({ demanda: 0, competencia: 10, tendencia: 0,
    estacionalidad: 10, dificultadLogistica: 10, riesgoRegulatorio: 10, margenNetoPct: -5 });
  assert.strictEqual(mejor.score, 100);
  assert.strictEqual(peor.score, 0);
});

test("mapeo del margen a nota 0-10", () => {
  assert.strictEqual(calcularScore({ margenNetoPct: 15 }).desglose.margen, 5);
  assert.strictEqual(calcularScore({ margenNetoPct: 35 }).desglose.margen, 10);
  assert.strictEqual(calcularScore({ margenNetoPct: -3 }).desglose.margen, 0);
});

test("valores fuera de rango se recortan a 0-10", () => {
  const r = calcularScore({ demanda: 25, competencia: -4, margenNetoPct: 20 });
  assert.strictEqual(r.desglose.demanda, 10);
  assert.strictEqual(r.desglose.competencia, 10);
});

test("veredictos por tramo", () => {
  assert.ok(calcularScore({ demanda: 10, competencia: 0, tendencia: 10, estacionalidad: 0,
    dificultadLogistica: 0, riesgoRegulatorio: 0, margenNetoPct: 40 })
    .veredicto.includes("Oportunidad fuerte"));
  assert.ok(calcularScore({ demanda: 0, competencia: 10, tendencia: 0, estacionalidad: 10,
    dificultadLogistica: 10, riesgoRegulatorio: 10, margenNetoPct: 0 })
    .veredicto.includes("Descartar"));
});

console.log("\n" + pasados + " tests pasados" + (process.exitCode ? " (con fallos)" : "."));
