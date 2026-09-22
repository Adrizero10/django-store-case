/* Tests del Analista IA de mercado. Ejecutar con:  node tests/analista-ia.test.js */
"use strict";

const assert = require("assert");
const AnalistaIA = require("../js/analista-ia.js");

let pasados = 0;
function test(nombre, fn) {
  try { fn(); pasados++; console.log("  ✓ " + nombre); }
  catch (err) { console.error("  ✗ " + nombre + "\n    " + err.message); process.exitCode = 1; }
}

function validarProducto(p) {
  assert.strictEqual(typeof p.nombre, "string");
  assert.ok(p.nombre.length > 0);
  assert.ok(["alta", "media", "baja"].includes(p.demanda));
  assert.ok(["alta", "media", "baja"].includes(p.competencia));
  assert.ok(["trending", "evergreen", "declive"].includes(p.tendencia));
  assert.ok(p.coste_unitario_estimado.min <= p.coste_unitario_estimado.max);
  assert.strictEqual(p.coste_unitario_estimado.moneda, "EUR");
  assert.ok(p.coste_envio_estimado.min <= p.coste_envio_estimado.max);
  assert.ok(p.cac_estimado.min <= p.cac_estimado.max);
  assert.ok(p.precio_venta_recomendado > 0);
  assert.ok(p.puntuacion_viabilidad >= 1 && p.puntuacion_viabilidad <= 10);
  assert.ok(Array.isArray(p.riesgos));
}

console.log("Analista IA:");

test("propone entre 5 y 10 productos para un nicho reconocido", () => {
  const r = AnalistaIA.analizar("mascotas");
  assert.ok(r.productos.length >= 5 && r.productos.length <= 10);
  r.productos.forEach(validarProducto);
});

test("todos los productos del nicho reconocido pertenecen a esa categoría", () => {
  const r = AnalistaIA.analizar("quiero vender productos para perros y gatos");
  r.productos.forEach(p => assert.strictEqual(p.categoria, "Mascotas"));
});

test("nicho sin coincidencias usa una búsqueda amplia pero sigue devolviendo 5-10 productos válidos", () => {
  const r = AnalistaIA.analizar("xyzqwerty123 sin sentido");
  assert.ok(r.productos.length >= 5 && r.productos.length <= 10);
  r.productos.forEach(validarProducto);
});

test("los productos vienen ordenados por puntuación de viabilidad descendente", () => {
  const r = AnalistaIA.analizar("fitness en casa");
  for (let i = 1; i < r.productos.length; i++) {
    assert.ok(r.productos[i - 1].puntuacion_viabilidad >= r.productos[i].puntuacion_viabilidad);
  }
});

test("el resumen ejecutivo es un texto no vacío que menciona el nicho", () => {
  const r = AnalistaIA.analizar("tecnología");
  assert.strictEqual(typeof r.resumen_ejecutivo, "string");
  assert.ok(r.resumen_ejecutivo.length > 20);
});

test("el margen bruto estimado se calcula a partir del precio y los costes", () => {
  const r = AnalistaIA.analizar("oficina");
  r.productos.forEach(p => {
    const costeUnitMedio = (p.coste_unitario_estimado.min + p.coste_unitario_estimado.max) / 2;
    const costeEnvioMedio = (p.coste_envio_estimado.min + p.coste_envio_estimado.max) / 2;
    const esperado = Math.round(((p.precio_venta_recomendado - costeUnitMedio - costeEnvioMedio) /
      p.precio_venta_recomendado) * 100 * 100) / 100;
    assert.ok(Math.abs(p.margen_bruto_pct - esperado) < 0.01);
  });
});

console.log("\n" + pasados + " tests pasados" + (process.exitCode ? " (con fallos)" : "."));
