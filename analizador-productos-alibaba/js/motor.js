/*
 * Motor de cálculo: finanzas de importación + scoring de oportunidad.
 *
 * Lógica pura, sin dependencias ni acceso al DOM: funciona igual en el
 * navegador (window.Motor) y en Node (module.exports) para poder testearla.
 *
 * Flujo financiero modelado (importación FOB desde China a España/UE):
 *   CIF     = FOB total + flete + seguro
 *   Arancel = CIF × arancel%
 *   IVA imp = (CIF + arancel) × IVA%          (recuperable si eres empresa)
 *   Landed  = CIF + arancel + despacho + transporte interior + muestras
 *             (+ IVA de importación solo si NO es recuperable)
 *
 * Metodología completa en INVESTIGACION.md.
 */
(function (raiz) {
  "use strict";

  function r2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }
  function num(v) { var n = Number(v); return isFinite(n) ? n : 0; }
  function limitar(v, lo, hi) { return Math.max(lo, Math.min(hi, num(v))); }

  /* ------------------------------------------------------------------ *
   * Finanzas
   * ------------------------------------------------------------------ */

  /**
   * Calcula landed cost y unit economics de un pedido.
   * Todas las cantidades en la misma divisa (EUR). Campos de `e`:
   *   unidades, precioFobUnidad, costeMuestras,
   *   fleteTotal, seguroTotal, arancelPct, ivaImportPct, despachoAduanas,
   *   transporteNacional, ivaRecuperable (bool),
   *   pvp (con IVA), ivaVentaPct, comisionPlataformaPct, comisionPagoPct,
   *   envioClienteUnidad, embalajeUnidad, publicidadUnidad, devolucionesPct,
   *   costesFijosMes, ventasMesEstimadas
   */
  function calcularFinanzas(e) {
    var uds = Math.max(1, Math.floor(num(e.unidades)) || 1);
    var res = { avisos: [] };

    // --- Importación ---
    res.valorMercancia = r2(num(e.precioFobUnidad) * uds);
    res.valorCif = r2(res.valorMercancia + num(e.fleteTotal) + num(e.seguroTotal));
    res.arancel = r2(res.valorCif * num(e.arancelPct) / 100);
    res.ivaImportacion = r2((res.valorCif + res.arancel) * num(e.ivaImportPct) / 100);

    var baseAterrizado = res.valorCif + res.arancel + num(e.despachoAduanas) +
                         num(e.transporteNacional) + num(e.costeMuestras);
    res.desembolsoTotal = r2(baseAterrizado + res.ivaImportacion);
    res.costeAterrizadoTotal = r2(e.ivaRecuperable ? baseAterrizado
                                                   : baseAterrizado + res.ivaImportacion);
    res.costeAterrizadoUnidad = r2(res.costeAterrizadoTotal / uds);

    // --- Por unidad vendida ---
    var divisorIva = 1 + num(e.ivaVentaPct) / 100;
    res.ingresoNetoUnidad = r2(num(e.pvp) / divisorIva);
    res.comisionPlataformaUnidad = r2(num(e.pvp) * num(e.comisionPlataformaPct) / 100);
    res.comisionPagoUnidad = r2(num(e.pvp) * num(e.comisionPagoPct) / 100);

    // Una devolución pierde producto + envío + embalaje: coste esperado
    // repartido entre todas las unidades vendidas.
    var costeBaseVenta = res.costeAterrizadoUnidad + num(e.envioClienteUnidad) +
                         num(e.embalajeUnidad);
    res.costeDevolucionesUnidad = r2(costeBaseVenta * num(e.devolucionesPct) / 100);

    res.costeVariableUnidad = r2(costeBaseVenta + res.comisionPlataformaUnidad +
                                 res.comisionPagoUnidad + num(e.publicidadUnidad) +
                                 res.costeDevolucionesUnidad);
    res.beneficioUnidad = r2(res.ingresoNetoUnidad - res.costeVariableUnidad);

    res.margenBrutoPct = 0;
    res.margenNetoPct = 0;
    if (res.ingresoNetoUnidad > 0) {
      res.margenBrutoPct = r2((res.ingresoNetoUnidad - res.costeAterrizadoUnidad) *
                              100 / res.ingresoNetoUnidad);
      res.margenNetoPct = r2(res.beneficioUnidad * 100 / res.ingresoNetoUnidad);
    }

    // --- Pedido completo / negocio ---
    res.beneficioPedido = r2(res.beneficioUnidad * uds);
    res.roiPct = res.desembolsoTotal > 0
        ? r2(res.beneficioPedido * 100 / res.desembolsoTotal) : 0;

    res.puntoEquilibrioUds = 0;
    res.paybackMeses = 0;
    if (res.beneficioUnidad > 0) {
      if (num(e.costesFijosMes) > 0) {
        res.puntoEquilibrioUds = Math.ceil(num(e.costesFijosMes) / res.beneficioUnidad);
      }
      if (num(e.ventasMesEstimadas) > 0) {
        var beneficioMes = res.beneficioUnidad * num(e.ventasMesEstimadas) -
                           num(e.costesFijosMes);
        if (beneficioMes > 0) res.paybackMeses = r2(res.desembolsoTotal / beneficioMes);
      }
    }

    // --- Avisos (reglas prácticas del sector) ---
    if (res.margenNetoPct < 0) {
      res.avisos.push("Pierdes dinero con cada venta: sube el PVP, negocia el FOB o descarta el producto.");
    } else if (res.margenNetoPct < 15) {
      res.avisos.push("Margen neto inferior al 15%: muy justo para absorber publicidad, devoluciones e imprevistos.");
    }
    if (num(e.pvp) > 0 && num(e.precioFobUnidad) > 0 &&
        res.ingresoNetoUnidad / Math.max(num(e.precioFobUnidad), 0.01) < 3) {
      res.avisos.push("No cumples la regla 3x (PVP sin IVA ≥ 3 veces el coste FOB), el mínimo de seguridad habitual.");
    }
    if (res.paybackMeses > 6) {
      res.avisos.push("Payback superior a 6 meses: capital inmovilizado demasiado tiempo para una primera importación.");
    }
    return res;
  }

  /* ------------------------------------------------------------------ *
   * Scoring de oportunidad (0-100)
   * ------------------------------------------------------------------ */

  // Pesos inspirados en los opportunity scores de Jungle Scout / Helium 10.
  var PESOS = {
    demanda: 0.25,
    competencia: 0.20,
    margen: 0.25,
    tendencia: 0.10,
    estacionalidad: 0.05,
    logistica: 0.10,
    riesgo: 0.05
  };

  // Margen neto % → nota 0-10: 0% → 0 | 15% (mínimo aceptable) → 5 | ≥30% → 10.
  function notaMargen(margenNetoPct) {
    var m = num(margenNetoPct);
    if (m <= 0) return 0;
    if (m >= 30) return 10;
    if (m <= 15) return (m / 15) * 5;
    return 5 + ((m - 15) / 15) * 5;
  }

  /**
   * `v`: valoraciones 0-10 {demanda, competencia, tendencia, estacionalidad,
   * dificultadLogistica, riesgoRegulatorio} + margenNetoPct (de calcularFinanzas).
   * competencia/estacionalidad/logística/riesgo se puntúan como intensidad
   * del problema (10 = peor) y aquí se invierten.
   */
  function calcularScore(v) {
    var desglose = {
      demanda: limitar(v.demanda, 0, 10),
      competencia: 10 - limitar(v.competencia, 0, 10),
      margen: notaMargen(v.margenNetoPct),
      tendencia: limitar(v.tendencia, 0, 10),
      estacionalidad: 10 - limitar(v.estacionalidad, 0, 10),
      logistica: 10 - limitar(v.dificultadLogistica, 0, 10),
      riesgo: 10 - limitar(v.riesgoRegulatorio, 0, 10)
    };
    var score = 0;
    for (var k in PESOS) score += desglose[k] * PESOS[k];
    score = Math.round(score * 100) / 10;

    var veredicto;
    if (score >= 70) veredicto = "Oportunidad fuerte: pide muestras y valida con un pedido pequeño.";
    else if (score >= 55) veredicto = "Prometedor: investiga más (competencia real, reseñas, costes).";
    else if (score >= 40) veredicto = "Dudoso: solo si puedes diferenciarte o mejorar el margen.";
    else veredicto = "Descartar: demanda/margen insuficientes o riesgo excesivo.";

    return { score: score, veredicto: veredicto, desglose: desglose };
  }

  var Motor = {
    calcularFinanzas: calcularFinanzas,
    calcularScore: calcularScore,
    PESOS_SCORE: PESOS
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Motor;
  else raiz.Motor = Motor;
})(typeof window !== "undefined" ? window : globalThis);
