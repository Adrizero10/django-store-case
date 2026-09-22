/*
 * Interfaz del Analista IA de mercado (pestaña "IA · Analista de mercado").
 * Usa AnalistaIA (analista-ia.js) para generar el análisis y lo pinta en
 * #panel-ia. Reutiliza el mismo almacén de ideas que app.js (localStorage,
 * clave "apa_ideas_v1") para poder enviar un producto sugerido al Ranking
 * con un click.
 */
(function () {
  "use strict";

  var CLAVE_ALMACEN = "apa_ideas_v1";
  var ultimoAnalisis = null;

  function $(sel) { return document.querySelector(sel); }

  function esc(texto) {
    var div = document.createElement("div");
    div.textContent = texto == null ? "" : String(texto);
    return div.innerHTML;
  }

  function eur(n) {
    return (Number(n) || 0).toLocaleString("es-ES",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  function eurRango(r) { return eur(r.min) + " – " + eur(r.max); }

  function avisar(texto) {
    var caja = $("#aviso-flotante");
    if (!caja) return;
    caja.textContent = texto;
    caja.classList.add("visible");
    clearTimeout(avisar._t);
    avisar._t = setTimeout(function () { caja.classList.remove("visible"); }, 2500);
  }

  function claseScore10(n) {
    return n >= 7 ? "score-alto" : n >= 5 ? "score-medio" : "score-bajo";
  }

  var ETIQUETA_TENDENCIA = { trending: "📈 Trending", evergreen: "🌲 Evergreen", declive: "📉 En declive" };

  function htmlProducto(p, idx) {
    var badges = ["Demanda: " + p.demanda, "Competencia: " + p.competencia,
      ETIQUETA_TENDENCIA[p.tendencia] || p.tendencia]
      .map(function (b) { return '<span class="badge">' + esc(b) + "</span>"; }).join("");

    var riesgos = p.riesgos.length
      ? "<ul>" + p.riesgos.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>"
      : '<p class="muted">Sin riesgos relevantes detectados.</p>';

    function fila(nombre, valor) {
      return "<tr><td>" + nombre + '</td><td class="num">' + valor + "</td></tr>";
    }

    var tabla = "<table>" +
      fila("Coste unitario estimado", eurRango(p.coste_unitario_estimado)) +
      fila("Coste de envío/logística estimado", eurRango(p.coste_envio_estimado)) +
      fila("CAC estimado", eurRango(p.cac_estimado)) +
      fila("Margen bruto estimado", '<strong>' + p.margen_bruto_pct.toFixed(0) + "%</strong>") +
      fila("Precio de venta recomendado", "<strong>" + eur(p.precio_venta_recomendado) + "</strong>") +
      "</table>";

    return '<div class="card producto-ia">' +
      '<div class="producto-ia-cab">' +
      "<h3>" + esc(p.nombre) + "</h3>" +
      '<span class="score ' + claseScore10(p.puntuacion_viabilidad) + '">' +
      p.puntuacion_viabilidad.toFixed(1) + "/10</span></div>" +
      '<p class="muted">' + esc(p.categoria) + " · " + esc(p.publico_objetivo) + "</p>" +
      '<div class="badges">' + badges + "</div>" +
      "<p>" + esc(p.razon_demanda) + "</p>" +
      tabla +
      "<p><strong>Riesgos y barreras de entrada:</strong></p>" + riesgos +
      '<p class="muted">Referencias de competencia: ' +
      esc(p.competidores_referencia.join(" · ")) + "</p>" +
      '<div class="acciones">' +
      '<button class="btn secundario btn-enviar-ranking" type="button" data-idx="' + idx +
      '">+ Enviar a Ranking</button></div>' +
      "</div>";
  }

  function renderResultado(resultado) {
    ultimoAnalisis = resultado;
    var html = '<div class="card"><h2>Resumen ejecutivo</h2><p>' +
      esc(resultado.resumen_ejecutivo) + "</p></div>" +
      '<div class="grid-productos-ia">' +
      resultado.productos.map(htmlProducto).join("") + "</div>";
    $("#panel-ia").innerHTML = html;
    $("#btn-ia-exportar").hidden = false;

    $("#panel-ia").querySelectorAll(".btn-enviar-ranking").forEach(function (btn) {
      btn.addEventListener("click", function () {
        enviarARanking(ultimoAnalisis.productos[Number(btn.dataset.idx)]);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Enviar un producto sugerido por la IA a la pestaña Ranking
   * ------------------------------------------------------------------ */

  var NOTA_DEMANDA = { alta: 9, media: 6, baja: 3 };
  var NOTA_COMPETENCIA = { alta: 9, media: 6, baja: 3 };
  var NOTA_TENDENCIA = { trending: 8, evergreen: 6, declive: 2 };

  function medio(r) { return (r.min + r.max) / 2; }

  function ideaDesdeProducto(p) {
    var riesgoRegulatorio = Math.min(10, 2 + p.riesgos.length * 2);
    return {
      id: "ia-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      nombre: p.nombre, categoria: p.categoria, urlAlibaba: "", proveedor: "",
      moq: 0, estado: "investigando", verificado: false, tradeAssurance: false,
      notas: "Sugerido por el Analista IA de mercado (simulado). " + p.razon_demanda +
        " Revisa y ajusta estas cifras de partida con datos reales de proveedor.",
      demanda: NOTA_DEMANDA[p.demanda] != null ? NOTA_DEMANDA[p.demanda] : 5,
      competencia: NOTA_COMPETENCIA[p.competencia] != null ? NOTA_COMPETENCIA[p.competencia] : 5,
      tendencia: NOTA_TENDENCIA[p.tendencia] != null ? NOTA_TENDENCIA[p.tendencia] : 5,
      estacionalidad: 5, dificultadLogistica: 4, riesgoRegulatorio: riesgoRegulatorio,
      unidades: 100, precioFobUnidad: medio(p.coste_unitario_estimado), costeMuestras: 0,
      fleteTotal: 0, seguroTotal: 0, arancelPct: 0, ivaImportPct: 21, despachoAduanas: 0,
      transporteNacional: 0, ivaRecuperable: true, pvp: p.precio_venta_recomendado,
      ivaVentaPct: 21, comisionPlataformaPct: 0, comisionPagoPct: 2.9,
      envioClienteUnidad: medio(p.coste_envio_estimado), embalajeUnidad: 0,
      publicidadUnidad: medio(p.cac_estimado), devolucionesPct: 3,
      costesFijosMes: 0, ventasMesEstimadas: 0
    };
  }

  function cargarIdeas() {
    try { return JSON.parse(localStorage.getItem(CLAVE_ALMACEN)) || []; }
    catch (e) { return []; }
  }

  function guardarIdeas(ideas) {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(ideas));
  }

  function enviarARanking(producto) {
    var ideas = cargarIdeas();
    ideas.push(ideaDesdeProducto(producto));
    guardarIdeas(ideas);
    avisar('"' + producto.nombre + '" enviado al Ranking.');
    var btnRanking = document.querySelector('#pestanas button[data-vista="ranking"]');
    if (btnRanking) btnRanking.click();
  }

  /* ------------------------------------------------------------------ *
   * Exportar el análisis en el formato JSON acordado
   * ------------------------------------------------------------------ */

  function exportarAnalisis() {
    if (!ultimoAnalisis) return;
    var blob = new Blob([JSON.stringify(ultimoAnalisis, null, 2)], { type: "application/json" });
    var enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = "analisis-mercado-ia.json";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  /* ------------------------------------------------------------------ *
   * Inicialización
   * ------------------------------------------------------------------ */

  function iniciar() {
    var form = $("#form-ia");
    if (!form) return; // AnalistaIA/UI no cargados en esta página
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var nicho = $("#ia-nicho").value.trim();
      if (!nicho) return;
      $("#panel-ia").innerHTML = '<p class="muted">Analizando "' + esc(nicho) + '"…</p>';
      setTimeout(function () {
        renderResultado(AnalistaIA.analizar(nicho));
      }, 250);
    });
    $("#btn-ia-exportar").addEventListener("click", exportarAnalisis);
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
