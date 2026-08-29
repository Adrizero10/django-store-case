# 📦 Analizador de productos Alibaba

Herramienta para decidir **qué productos importar de Alibaba y vender online**:

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
index.html            Interfaz (pestañas: Ranking, Nueva idea, Calculadora, Metodología)
css/estilos.css       Estilos
js/motor.js           Motor de cálculo puro (finanzas + scoring), sin DOM
js/app.js             Interfaz: formularios, ranking, localStorage, import/export
tests/motor.test.js   Tests del motor (node tests/motor.test.js)
INVESTIGACION.md      Metodología completa: cómo se investigan productos, con fuentes
```

## Tests

```bash
node tests/motor.test.js   # 12 tests de las fórmulas financieras y del scoring
```

## Metodología

El documento [INVESTIGACION.md](INVESTIGACION.md) explica cómo hacen esto los
vendedores profesionales: el embudo de selección de productos, cómo medir
demanda y competencia, cómo comprar en Alibaba con seguridad (proveedores
verificados, Trade Assurance, muestras, MOQ, incoterms) y todas las fórmulas
financieras que implementa la herramienta, con fuentes.
