/*
 * Interfaz del Analizador de productos Alibaba.
 * Sin dependencias: DOM + localStorage. La lógica de negocio vive en motor.js.
 */
(function () {
  "use strict";

  var CLAVE_ALMACEN = "apa_ideas_v1";

  /* ------------------------------------------------------------------ *
   * Definición de campos (una sola fuente para formularios y lectura)
   * ------------------------------------------------------------------ */

  var ESTADOS = [
    ["investigando", "Investigando"],
    ["muestras", "Muestras pedidas"],
    ["pedido", "Pedido realizado"],
    ["venta", "En venta"],
    ["descartado", "Descartado"]
  ];

  var CAMPOS_IDENTIFICACION = [
    { k: "nombre", l: "Nombre del producto *", t: "text", req: true },
    { k: "categoria", l: "Categoría", t: "text" },
    { k: "urlAlibaba", l: "URL en Alibaba", t: "url" },
    { k: "proveedor", l: "Proveedor", t: "text" },
    { k: "moq", l: "MOQ (pedido mínimo)", t: "number" },
    { k: "estado", l: "Estado", t: "select", ops: ESTADOS },
    { k: "verificado", l: "Proveedor verificado", t: "check" },
    { k: "tradeAssurance", l: "Con Trade Assurance", t: "check" }
  ];

  var VALORACIONES = [
    { k: "demanda", l: "Demanda", d: "10 = altísimo volumen de búsquedas/ventas" },
    { k: "competencia", l: "Competencia", d: "10 = mercado saturado" },
    { k: "tendencia", l: "Tendencia", d: "Google Trends 12-24 meses; 10 = crecimiento sostenido" },
    { k: "estacionalidad", l: "Estacionalidad", d: "10 = solo se vende en una época del año" },
    { k: "dificultadLogistica", l: "Dificultad logística", d: "peso, volumen, fragilidad, baterías; 10 = pesadilla" },
    { k: "riesgoRegulatorio", l: "Riesgo regulatorio", d: "certificaciones CE, patentes, marcas; 10 = alto" }
  ];

  var CAMPOS_FINANZAS = [
    { k: "unidades", l: "Unidades del pedido", v: 100 },
    { k: "precioFobUnidad", l: "Precio FOB por unidad" },
    { k: "costeMuestras", l: "Muestras / moldes / branding" },
    { k: "fleteTotal", l: "Flete internacional (envío completo)" },
    { k: "seguroTotal", l: "Seguro de la mercancía" },
    { k: "arancelPct", l: "Arancel % (sobre CIF, según TARIC)" },
    { k: "ivaImportPct", l: "IVA de importación %", v: 21 },
    { k: "despachoAduanas", l: "Despacho de aduanas / tasas" },
    { k: "transporteNacional", l: "Transporte nacional a tu almacén" },
    { k: "ivaRecuperable", l: "IVA de importación recuperable (empresa/autónomo)", t: "check", v: true },
    { k: "pvp", l: "PVP con IVA" },
    { k: "ivaVentaPct", l: "IVA de venta %", v: 21 },
    { k: "comisionPlataformaPct", l: "Comisión plataforma % (Amazon ~15)" },
    { k: "comisionPagoPct", l: "Comisión de pago % (Stripe/PayPal ~3)" },
    { k: "envioClienteUnidad", l: "Envío al cliente por unidad" },
    { k: "embalajeUnidad", l: "Embalaje por unidad" },
    { k: "publicidadUnidad", l: "Publicidad por unidad vendida" },
    { k: "devolucionesPct", l: "Devoluciones % (típico 2-5)" },
    { k: "costesFijosMes", l: "Costes fijos mensuales" },
    { k: "ventasMesEstimadas", l: "Ventas mensuales estimadas (uds)" }
  ];

  var NOMBRES_FACTORES = {
    demanda: "Demanda", competencia: "Competencia (invertida)", margen: "Margen",
    tendencia: "Tendencia", estacionalidad: "Estacionalidad (invertida)",
    logistica: "Logística (invertida)", riesgo: "Riesgo regulatorio (invertido)"
  };

  /* ------------------------------------------------------------------ *
   * Utilidades
   * ------------------------------------------------------------------ */

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

  function pct(n) {
    return (Number(n) || 0).toLocaleString("es-ES",
      { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
  }

  function avisar(texto) {
    var caja = $("#aviso-flotante");
    caja.textContent = texto;
    caja.classList.add("visible");
    clearTimeout(avisar._t);
    avisar._t = setTimeout(function () { caja.classList.remove("visible"); }, 2500);
  }

  function claseScore(score) {
    return score >= 70 ? "score-alto" : score >= 55 ? "score-medio" : "score-bajo";
  }

  /* ------------------------------------------------------------------ *
   * Almacenamiento
   * ------------------------------------------------------------------ */

  function cargarIdeas() {
    try { return JSON.parse(localStorage.getItem(CLAVE_ALMACEN)) || []; }
    catch (e) { return []; }
  }

  function guardarIdeas(ideas) {
    localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(ideas));
  }

  function analizar(idea) {
    var fin = Motor.calcularFinanzas(idea);
    var sc = Motor.calcularScore({
      demanda: idea.demanda, competencia: idea.competencia,
      tendencia: idea.tendencia, estacionalidad: idea.estacionalidad,
      dificultadLogistica: idea.dificultadLogistica,
      riesgoRegulatorio: idea.riesgoRegulatorio,
      margenNetoPct: fin.margenNetoPct
    });
    return { fin: fin, sc: sc };
  }

  /* ------------------------------------------------------------------ *
   * Generación y lectura de formularios
   * ------------------------------------------------------------------ */

  function generarCampos(config, contenedor, prefijo) {
    var html = config.map(function (c) {
      var id = prefijo + c.k;
      if (c.t === "check") {
        return '<div class="campo campo-check"><input type="checkbox" id="' + id +
               '"' + (c.v ? " checked" : "") + '><label for="' + id + '">' + c.l + "</label></div>";
      }
      if (c.t === "select") {
        var ops = c.ops.map(function (o) {
          return '<option value="' + o[0] + '">' + o[1] + "</option>";
        }).join("");
        return '<div class="campo"><label for="' + id + '">' + c.l +
               '</label><select id="' + id + '">' + ops + "</select></div>";
      }
      var tipo = c.t || "number";
      var extra = tipo === "number" ? ' min="0" step="any"' : "";
      var valor = c.v != null ? ' value="' + c.v + '"' : "";
      return '<div class="campo"><label for="' + id + '">' + c.l + '</label><input type="' +
             tipo + '" id="' + id + '"' + extra + valor + (c.req ? " required" : "") + "></div>";
    }).join("");
    contenedor.innerHTML = html;
  }

  function generarValoraciones(contenedor, prefijo) {
    contenedor.innerHTML = VALORACIONES.map(function (c) {
      var id = prefijo + c.k;
      return '<div class="campo-rango"><label for="' + id + '"><span>' + c.l +
             ' <span class="muted">· ' + c.d + "</span></span><output id="+ id +
             '-out>5</output></label><input type="range" id="' + id +
             '" min="0" max="10" step="0.5" value="5"></div>';
    }).join("");
    contenedor.querySelectorAll("input[type=range]").forEach(function (input) {
      input.addEventListener("input", function () {
        document.getElementById(input.id + "-out").textContent = input.value;
      });
    });
  }

  function leerCampos(config, prefijo, destino) {
    config.forEach(function (c) {
      var el = document.getElementById(prefijo + c.k);
      if (!el) return;
      if (c.t === "check") destino[c.k] = el.checked;
      else if (c.t === "text" || c.t === "url" || c.t === "select") destino[c.k] = el.value.trim();
      else destino[c.k] = el.value === "" ? 0 : Number(el.value);
    });
    return destino;
  }

  function ponerCampos(config, prefijo, origen) {
    config.forEach(function (c) {
      var el = document.getElementById(prefijo + c.k);
      if (!el) return;
      var valor = origen[c.k];
      if (c.t === "check") el.checked = !!valor;
      else el.value = valor != null ? valor : (c.v != null ? c.v : "");
    });
  }

  function ponerValoraciones(prefijo, origen) {
    VALORACIONES.forEach(function (c) {
      var el = document.getElementById(prefijo + c.k);
      var valor = origen[c.k] != null ? origen[c.k] : 5;
      el.value = valor;
      document.getElementById(prefijo + c.k + "-out").textContent = valor;
    });
  }

  function leerValoraciones(prefijo, destino) {
    VALORACIONES.forEach(function (c) {
      destino[c.k] = Number(document.getElementById(prefijo + c.k).value);
    });
    return destino;
  }

  /* ------------------------------------------------------------------ *
   * Paneles de resultados
   * ------------------------------------------------------------------ */

  function htmlKpis(fin, sc) {
    var kpis = "";
    if (sc) {
      kpis += '<div class="kpi"><div class="v"><span class="score ' + claseScore(sc.score) +
              '">' + sc.score.toFixed(1) + "</span></div><div class='l'>Puntuación (0-100)</div></div>";
    }
    kpis += '<div class="kpi"><div class="v">' + eur(fin.costeAterrizadoUnidad) +
            '</div><div class="l">Coste aterrizado / ud</div></div>' +
            '<div class="kpi"><div class="v ' + (fin.beneficioUnidad >= 0 ? "pos" : "neg") + '">' +
            eur(fin.beneficioUnidad) + '</div><div class="l">Beneficio / ud</div></div>' +
            '<div class="kpi"><div class="v ' +
            (fin.margenNetoPct >= 15 ? "pos" : fin.margenNetoPct < 0 ? "neg" : "") + '">' +
            pct(fin.margenNetoPct) + '</div><div class="l">Margen neto</div></div>' +
            '<div class="kpi"><div class="v">' + pct(fin.roiPct) +
            '</div><div class="l">ROI del pedido</div></div>';
    return '<div class="kpis">' + kpis + "</div>";
  }

  function htmlAvisos(fin) {
    if (!fin.avisos.length) return "";
    return '<div class="avisos">' + fin.avisos.map(function (a) {
      return "<div>⚠️ " + esc(a) + "</div>";
    }).join("") + "</div>";
  }

  function htmlTablaFinanzas(fin) {
    function fila(nombre, valor, negrita) {
      var celda = negrita ? "<strong>" + valor + "</strong>" : valor;
      var etiqueta = negrita ? "<strong>" + nombre + "</strong>" : nombre;
      return "<tr><td>" + etiqueta + '</td><td class="num">' + celda + "</td></tr>";
    }
    return "<table>" +
      '<tr><th colspan="2">Importación</th></tr>' +
      fila("Mercancía (FOB)", eur(fin.valorMercancia)) +
      fila("Valor CIF (FOB + flete + seguro)", eur(fin.valorCif)) +
      fila("Arancel", eur(fin.arancel)) +
      fila("IVA de importación", eur(fin.ivaImportacion)) +
      fila("Desembolso total del pedido", eur(fin.desembolsoTotal), true) +
      fila("Coste aterrizado por unidad", eur(fin.costeAterrizadoUnidad), true) +
      '<tr><th colspan="2">Por unidad vendida</th></tr>' +
      fila("Ingreso neto (sin IVA)", eur(fin.ingresoNetoUnidad)) +
      fila("Comisión plataforma", "−" + eur(fin.comisionPlataformaUnidad)) +
      fila("Comisión de pago", "−" + eur(fin.comisionPagoUnidad)) +
      fila("Coste esperado de devoluciones", "−" + eur(fin.costeDevolucionesUnidad)) +
      fila("Coste variable total", eur(fin.costeVariableUnidad)) +
      fila("Beneficio por unidad", eur(fin.beneficioUnidad), true) +
      '<tr><th colspan="2">Negocio</th></tr>' +
      fila("Margen bruto", pct(fin.margenBrutoPct)) +
      fila("Beneficio si se vende todo el pedido", eur(fin.beneficioPedido)) +
      fila("Punto de equilibrio (uds/mes)", String(fin.puntoEquilibrioUds)) +
      fila("Payback", fin.paybackMeses ? fin.paybackMeses.toFixed(1) + " meses" : "—") +
      "</table>";
  }

  function htmlDesgloseScore(sc) {
    var filas = Object.keys(sc.desglose).map(function (k) {
      var nota = sc.desglose[k];
      var peso = Math.round(Motor.PESOS_SCORE[k] * 100);
      return "<tr><td>" + NOMBRES_FACTORES[k] + ' <span class="muted">· peso ' + peso +
             '%</span></td><td class="num">' + nota.toFixed(1) +
             '</td><td style="width:38%"><div class="bar"><span style="width:' +
             (nota * 10) + '%"></span></div></td></tr>';
    }).join("");
    return "<p><strong>Veredicto:</strong> " + esc(sc.veredicto) + "</p>" +
           '<table><tr><th>Factor</th><th class="num">Nota /10</th><th>Nivel</th></tr>' +
           filas + "</table>";
  }

  /* ------------------------------------------------------------------ *
   * Vista: ranking
   * ------------------------------------------------------------------ */

  function renderRanking() {
    var ideas = cargarIdeas().map(function (idea) {
      var a = analizar(idea);
      return { idea: idea, fin: a.fin, sc: a.sc };
    }).sort(function (x, y) { return y.sc.score - x.sc.score; });

    var tabla = $("#tabla-ranking");
    if (!ideas.length) {
      tabla.innerHTML = '<tr><td class="muted">Aún no hay ideas. Crea la primera o carga los ejemplos.</td></tr>';
      return;
    }
    var filas = ideas.map(function (fila, i) {
      var idea = fila.idea, fin = fila.fin, sc = fila.sc;
      var estado = (ESTADOS.find(function (e) { return e[0] === idea.estado; }) || ["", "—"])[1];
      return '<tr class="fila-idea" data-id="' + idea.id + '">' +
        "<td>" + (i + 1) + "</td>" +
        "<td><strong>" + esc(idea.nombre) + "</strong>" +
        (idea.categoria ? '<br><span class="muted">' + esc(idea.categoria) + "</span>" : "") + "</td>" +
        "<td>" + esc(estado) + "</td>" +
        '<td class="num"><span class="score ' + claseScore(sc.score) + '">' +
        sc.score.toFixed(1) + "</span></td>" +
        '<td class="num">' + eur(fin.costeAterrizadoUnidad) + "</td>" +
        '<td class="num">' + eur(idea.pvp) + "</td>" +
        '<td class="num ' + (fin.beneficioUnidad >= 0 ? "pos" : "neg") + '">' +
        eur(fin.beneficioUnidad) + "</td>" +
        '<td class="num ' + (fin.margenNetoPct >= 15 ? "pos" : fin.margenNetoPct < 0 ? "neg" : "") +
        '">' + pct(fin.margenNetoPct) + "</td>" +
        '<td class="num">' + pct(fin.roiPct) + "</td></tr>";
    }).join("");
    tabla.innerHTML = "<tr><th>#</th><th>Producto</th><th>Estado</th>" +
      '<th class="num">Score</th><th class="num">Landed/ud</th><th class="num">PVP</th>' +
      '<th class="num">Beneficio/ud</th><th class="num">Margen neto</th>' +
      '<th class="num">ROI pedido</th></tr>' + filas;

    tabla.querySelectorAll(".fila-idea").forEach(function (tr) {
      tr.addEventListener("click", function () { abrirEditor(tr.dataset.id); });
    });
  }

  /* ------------------------------------------------------------------ *
   * Vista: editor
   * ------------------------------------------------------------------ */

  var idEnEdicion = null;

  function abrirEditor(id) {
    idEnEdicion = id || null;
    var idea = cargarIdeas().find(function (x) { return x.id === id; }) || {};
    $("#titulo-editor").textContent = idea.id
      ? "Editar: " + idea.nombre : "Nueva idea de producto";
    $("#btn-eliminar").hidden = !idea.id;
    $("#form-idea").reset();
    ponerCampos(CAMPOS_IDENTIFICACION, "c-", idea);
    ponerValoraciones("v-", idea);
    ponerCampos(CAMPOS_FINANZAS, "f-", idea);
    $("#c-notas").value = idea.notas || "";
    mostrarVista("editor");
    renderAnalisisVivo();
  }

  function leerIdeaDelFormulario() {
    var idea = { id: idEnEdicion || ("idea-" + Date.now()), notas: $("#c-notas").value };
    leerCampos(CAMPOS_IDENTIFICACION, "c-", idea);
    leerValoraciones("v-", idea);
    leerCampos(CAMPOS_FINANZAS, "f-", idea);
    return idea;
  }

  function renderAnalisisVivo() {
    var idea = leerIdeaDelFormulario();
    var a = analizar(idea);
    $("#panel-analisis").innerHTML = htmlKpis(a.fin, a.sc) + htmlAvisos(a.fin) +
      htmlDesgloseScore(a.sc) + "<br>" + htmlTablaFinanzas(a.fin);
  }

  /* ------------------------------------------------------------------ *
   * Vista: calculadora
   * ------------------------------------------------------------------ */

  function renderCalculadora() {
    var entradas = leerCampos(CAMPOS_FINANZAS, "q-", {});
    var fin = Motor.calcularFinanzas(entradas);
    $("#panel-calculadora").innerHTML =
      htmlKpis(fin, null) + htmlAvisos(fin) + htmlTablaFinanzas(fin);
  }

  /* ------------------------------------------------------------------ *
   * Ejemplos, exportar, importar
   * ------------------------------------------------------------------ */

  var EJEMPLOS = [
    {
      id: "ej-funda", nombre: "Funda iPhone magnética MagSafe", categoria: "Accesorios móvil",
      proveedor: "Shenzhen Case Factory", verificado: true, tradeAssurance: true, moq: 100,
      estado: "investigando", notas: "Mercado saturado pero conocido.",
      demanda: 8, competencia: 9, tendencia: 6, estacionalidad: 2,
      dificultadLogistica: 1, riesgoRegulatorio: 2,
      unidades: 300, precioFobUnidad: 1.2, costeMuestras: 40, fleteTotal: 120,
      seguroTotal: 10, arancelPct: 6.5, ivaImportPct: 21, despachoAduanas: 60,
      transporteNacional: 30, ivaRecuperable: true, pvp: 14.99, ivaVentaPct: 21,
      comisionPlataformaPct: 0, comisionPagoPct: 2.9, envioClienteUnidad: 2.5,
      embalajeUnidad: 0.3, publicidadUnidad: 1.5, devolucionesPct: 3,
      costesFijosMes: 120, ventasMesEstimadas: 80
    },
    {
      id: "ej-botella", nombre: "Botella térmica acero 750 ml personalizada", categoria: "Hogar / deporte",
      proveedor: "Zhejiang Drinkware Co.", verificado: true, tradeAssurance: true, moq: 200,
      estado: "investigando", notas: "Requiere declaración de contacto alimentario (LFGB/FDA).",
      demanda: 7, competencia: 6, tendencia: 7, estacionalidad: 3,
      dificultadLogistica: 4, riesgoRegulatorio: 4,
      unidades: 200, precioFobUnidad: 2.8, costeMuestras: 60, fleteTotal: 260,
      seguroTotal: 15, arancelPct: 6, ivaImportPct: 21, despachoAduanas: 80,
      transporteNacional: 40, ivaRecuperable: true, pvp: 24.99, ivaVentaPct: 21,
      comisionPlataformaPct: 15, comisionPagoPct: 0, envioClienteUnidad: 3.2,
      embalajeUnidad: 0.5, publicidadUnidad: 2.5, devolucionesPct: 4,
      costesFijosMes: 150, ventasMesEstimadas: 60
    },
    {
      id: "ej-organizador", nombre: "Organizador de escritorio de bambú", categoria: "Oficina",
      proveedor: "Fujian Bamboo Crafts", verificado: false, tradeAssurance: true, moq: 100,
      estado: "investigando", notas: "Voluminoso: el flete pesa mucho en el coste.",
      demanda: 6, competencia: 4, tendencia: 7, estacionalidad: 2,
      dificultadLogistica: 6, riesgoRegulatorio: 2,
      unidades: 150, precioFobUnidad: 4.5, costeMuestras: 35, fleteTotal: 380,
      seguroTotal: 20, arancelPct: 0, ivaImportPct: 21, despachoAduanas: 90,
      transporteNacional: 45, ivaRecuperable: true, pvp: 34.99, ivaVentaPct: 21,
      comisionPlataformaPct: 15, comisionPagoPct: 0, envioClienteUnidad: 4.5,
      embalajeUnidad: 0.8, publicidadUnidad: 3, devolucionesPct: 5,
      costesFijosMes: 150, ventasMesEstimadas: 40
    }
  ];

  function cargarEjemplos() {
    var ideas = cargarIdeas();
    var nuevos = 0;
    EJEMPLOS.forEach(function (ejemplo) {
      if (!ideas.some(function (i) { return i.id === ejemplo.id; })) {
        ideas.push(JSON.parse(JSON.stringify(ejemplo)));
        nuevos++;
      }
    });
    guardarIdeas(ideas);
    renderRanking();
    avisar(nuevos + " ejemplos añadidos.");
  }

  function exportarJson() {
    var blob = new Blob([JSON.stringify(cargarIdeas(), null, 2)],
                        { type: "application/json" });
    var enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(blob);
    enlace.download = "ideas-productos.json";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  function importarJson(archivo) {
    var lector = new FileReader();
    lector.onload = function () {
      try {
        var datos = JSON.parse(lector.result);
        if (!Array.isArray(datos)) throw new Error("formato inválido");
        guardarIdeas(datos);
        renderRanking();
        avisar(datos.length + " ideas importadas.");
      } catch (e) {
        avisar("No se pudo importar: el archivo no es un JSON válido de esta herramienta.");
      }
    };
    lector.readAsText(archivo);
  }

  /* ------------------------------------------------------------------ *
   * Navegación e inicialización
   * ------------------------------------------------------------------ */

  function mostrarVista(nombre) {
    document.querySelectorAll(".vista").forEach(function (v) {
      v.classList.toggle("activa", v.id === "vista-" + nombre);
    });
    document.querySelectorAll("#pestanas button").forEach(function (b) {
      b.classList.toggle("activo", b.dataset.vista === nombre);
    });
    if (nombre === "ranking") renderRanking();
  }

  function iniciar() {
    generarCampos(CAMPOS_IDENTIFICACION, $("#campos-identificacion"), "c-");
    generarValoraciones($("#campos-valoraciones"), "v-");
    generarCampos(CAMPOS_FINANZAS, $("#campos-finanzas-idea"), "f-");
    generarCampos(CAMPOS_FINANZAS, $("#campos-finanzas-calc"), "q-");

    document.querySelectorAll("#pestanas button").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.vista === "editor") abrirEditor(null);
        else mostrarVista(b.dataset.vista);
      });
    });

    $("#btn-nueva").addEventListener("click", function () { abrirEditor(null); });
    $("#btn-ejemplos").addEventListener("click", cargarEjemplos);
    $("#btn-exportar").addEventListener("click", exportarJson);
    $("#input-importar").addEventListener("change", function (ev) {
      if (ev.target.files[0]) importarJson(ev.target.files[0]);
      ev.target.value = "";
    });

    $("#form-idea").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var idea = leerIdeaDelFormulario();
      var ideas = cargarIdeas();
      var pos = ideas.findIndex(function (x) { return x.id === idea.id; });
      if (pos >= 0) ideas[pos] = idea; else ideas.push(idea);
      guardarIdeas(ideas);
      avisar("Idea guardada.");
      mostrarVista("ranking");
    });
    $("#form-idea").addEventListener("input", renderAnalisisVivo);
    $("#btn-cancelar").addEventListener("click", function () { mostrarVista("ranking"); });
    $("#btn-eliminar").addEventListener("click", function () {
      if (!idEnEdicion) return;
      if (!confirm("¿Eliminar esta idea? No se puede deshacer.")) return;
      guardarIdeas(cargarIdeas().filter(function (x) { return x.id !== idEnEdicion; }));
      avisar("Idea eliminada.");
      mostrarVista("ranking");
    });

    $("#form-calculadora").addEventListener("input", renderCalculadora);

    renderRanking();
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
