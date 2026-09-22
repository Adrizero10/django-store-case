# 📦 Analizador de productos Alibaba

Herramienta para decidir **qué productos importar de Alibaba y vender online**:

- **IA · Analista de mercado**: dado un nicho, categoría o producto, propone entre
  5 y 10 ideas de producto con demanda, competencia, tendencia, costes estimados,
  margen bruto, precio de venta recomendado, viabilidad (1-10) y riesgos, en el
  formato de un analista de mercado e inteligencia comercial. **Es una simulación
  local** (sin llamar a ninguna IA externa todavía): usa una base de plantillas por
  categoría con rangos realistas del sector, no datos de mercado en tiempo real.
  Cada idea se puede enviar con un click al Ranking para investigarla en detalle.
- **Ranking de ideas** con puntuación de oportunidad 0-100 (demanda, competencia,
  margen, tendencia, estacionalidad, logística y riesgo), al estilo de los
  *opportunity scores* de Jungle Scout / Helium 10.
- **Calculadora coste-beneficio** completa de importación: coste aterrizado
  (FOB → CIF → arancel → IVA), márgenes, beneficio por unidad, ROI del pedido,
  punto de equilibrio y payback, con avisos automáticos (regla 3x, margen
  mínimo 15%, payback ≤ 6 meses).
- **Ficha de investigación** por producto: proveedor, MOQ, Trade Assurance,
  valoraciones de mercado y notas, con análisis recalculado en vivo.

Todo en español, sin servidor y sin dependencias: HTML + CSS + JavaScript.
Los datos se guardan en tu navegador (localStorage) y puedes exportarlos e
importarlos como JSON.

## Cómo usarla

Abre `index.html` en el navegador. Ya está.

```bash
# o, si prefieres servirla en local:
cd analizador-productos-alibaba
python3 -m http.server 8000   # → http://localhost:8000
```

Pulsa **"Cargar 3 ejemplos"** en la pestaña Ranking para ver la herramienta
con datos realistas.

## Estructura

```
index.html               Interfaz (pestañas: Ranking, IA, Nueva idea, Calculadora, Metodología)
css/estilos.css          Estilos
js/motor.js              Motor de cálculo puro (finanzas + scoring), sin DOM
js/analista-ia.js        Motor del Analista IA (simulación local), sin DOM
js/app.js                Interfaz: formularios, ranking, localStorage, import/export
js/ia-ui.js              Interfaz de la pestaña IA: formulario, tarjetas, envío a Ranking
tests/motor.test.js      Tests del motor (node tests/motor.test.js)
tests/analista-ia.test.js Tests del Analista IA (node tests/analista-ia.test.js)
INVESTIGACION.md         Metodología completa: cómo se investigan productos, con fuentes
```

## Tests

```bash
node tests/motor.test.js        # 12 tests de las fórmulas financieras y del scoring
node tests/analista-ia.test.js  # 6 tests del Analista IA de mercado
```

## Analista IA de mercado (simulación local)

La pestaña **IA · Analista de mercado** implementa el rol de "analista de mercado
e inteligencia comercial" descrito en el prompt del proyecto: dado un nicho,
categoría o producto, devuelve un JSON con 5-10 ideas de producto (demanda,
competencia, tendencia, costes, margen, precio recomendado, viabilidad y
riesgos) y un resumen ejecutivo.

Por ahora **no llama a ninguna IA externa**: `js/analista-ia.js` simula la
respuesta con una base de plantillas por categoría (moda, hogar, mascotas,
fitness, belleza, tecnología, bebés, oficina, jardín/coche) y rangos de coste
realistas, con una pequeña variación aleatoria en cada ejecución. El formato de
salida ya coincide con el JSON acordado, así que el día que se quiera conectar
una IA real (p. ej. la API de Claude, vía un backend que proteja la API key),
basta con sustituir la función `analizar()` por la llamada real manteniendo el
mismo contrato de datos — el resto de la interfaz (tarjetas, exportar JSON,
enviar a Ranking) no cambia.

## Metodología

El documento [INVESTIGACION.md](INVESTIGACION.md) explica cómo hacen esto los
vendedores profesionales: el embudo de selección de productos, cómo medir
demanda y competencia, cómo comprar en Alibaba con seguridad (proveedores
verificados, Trade Assurance, muestras, MOQ, incoterms) y todas las fórmulas
financieras que implementa la herramienta, con fuentes.
