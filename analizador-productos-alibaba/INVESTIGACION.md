# Investigación: cómo se buscan productos ganadores para importar de Alibaba y venderlos online

Este documento resume cómo lo hacen los vendedores profesionales (Amazon FBA, tiendas propias,
dropshipping) y qué metodología implementa la herramienta de este repo (`index.html`).

---

## 1. El proceso completo (pipeline profesional)

Los vendedores serios no "eligen un producto": pasan un embudo de candidatos por filtros.

```
Ideas (50-100 candidatos)
   │  1. Filtro de demanda        → ¿la gente lo busca/compra?
   │  2. Filtro de competencia    → ¿puedo entrar y diferenciarme?
   │  3. Filtro financiero        → ¿los números salen? (regla 3x, margen ≥15-20%)
   │  4. Filtro logístico/legal   → ¿es fácil de enviar y legal de vender?
   │  5. Validación con proveedor → muestras + presupuesto real (FOB, MOQ, flete)
   ▼
1-3 productos → pedido pequeño de prueba → medir → escalar o descartar
```

La clave: **se descartan la mayoría**. Un buen proceso mata 95 ideas de cada 100 antes
de gastar dinero.

## 2. Cómo se mide la demanda y el mercado

Señales que usan las herramientas profesionales (Jungle Scout, Helium 10) y que puedes
replicar gratis o barato:

- **Volumen de búsquedas**: Google Keyword Planner, Google Trends (tendencia 12-24 meses:
  quieres crecimiento sostenido, no un pico viral que ya pasó). Para Amazon: Helium 10
  Magnet / Jungle Scout Keyword Scout.
- **Ventas estimadas de competidores**: extensiones de Jungle Scout / Helium 10 estiman
  unidades/mes de los listados top. Regla común FBA: los 10 primeros resultados deberían
  sumar ≥ 2.000-3.000 ventas/mes para que haya mercado.
- **Competencia**: número de vendedores, cantidad de reseñas de los líderes (si los top
  tienen >1.000 reseñas es muy difícil entrar; <200-300 reseñas con listados mediocres =
  hueco), calidad de fotos/descripciones.
- **Scores de oportunidad**: Jungle Scout y Helium 10 puntúan nichos de 1 a 10 combinando
  demanda, competencia y calidad de listados; 7-10 = alta demanda con baja competencia.
  Nuestra herramienta replica esta idea con un score 0-100 (ver sección 5).
- **Tendencias de sourcing**: los propios rankings de Alibaba (productos más pedidos,
  tasa de recompra), TikTok Shop / redes para detectar demanda emergente, y categorías
  con crecimiento estable (fluctuación trimestral <5%) en vez de modas.

**Criterios clásicos de "producto ganador"** para una primera importación:
pequeño y ligero (flete barato), no frágil, sin electrónica compleja ni baterías,
sin tallas (evita devoluciones), precio de venta 15-60 €, mejorable/diferenciable,
demanda todo el año, y sin certificaciones caras ni patentes.

## 3. Cómo comprar en Alibaba con seguridad

1. **Filtra proveedores**: badge *Verified Supplier* (auditado por un tercero) + *Trade
   Assurance* (el pago queda protegido si no entregan lo acordado). El badge no garantiza
   calidad: es un filtro, no una prueba.
2. **Distingue fábrica de trading company** (pide la licencia de negocio y compárala con
   el nombre de la empresa; una videollamada enseñando la fábrica es normal pedirla).
3. **Contacta 5-10 proveedores** con la misma plantilla (specs, cantidad, incoterm) para
   comparar precios reales y velocidad/calidad de respuesta.
4. **Negocia el MOQ**: el mínimo publicado casi siempre baja (30-50%) a cambio de un
   precio unitario algo mayor. Para validar, prioriza MOQ bajo sobre precio bajo.
5. **Pide muestras SIEMPRE** (pagadas, 20-50 € con envío): es el paso más barato para
   evitar el error más caro.
6. **Paga dentro de Alibaba** (Trade Assurance), nunca por transferencia fuera de la
   plataforma. Para pedidos grandes: inspección pre-embarque de terceros (SGS, V-Trust,
   Bureau Veritas, ~200-300 €).
7. **Incoterms**: FOB (tú contratas el flete desde el puerto chino; lo normal con un
   transitario/forwarder) o DDP (el proveedor entrega con aranceles pagados; más caro
   pero simple para empezar). EXW suele salir caro para novatos.

## 4. Las finanzas: landed cost y unit economics

Es donde más gente se equivoca: **el coste real aterrizado suele ser un 40-50% superior
al precio FOB** que ves en Alibaba. Fórmulas que implementa la calculadora:

**Coste del pedido (importación a España/UE):**

```
Valor CIF        = FOB total + flete internacional + seguro
Arancel          = CIF × arancel% (según código TARIC del producto; 0-12% típico)
IVA importación  = (CIF + arancel) × 21%   ← recuperable si eres empresa/autónomo
Coste aterrizado = CIF + arancel + despacho aduanas + transporte interior
                   + muestras/moldes (+ IVA si NO es recuperable)
Landed cost/ud   = Coste aterrizado / unidades
```

**Unit economics (por unidad vendida):**

```
Ingreso neto     = PVP / 1,21                       (el IVA de venta no es tuyo)
Beneficio/ud     = Ingreso neto − landed/ud − comisión plataforma − comisión pago
                   − envío al cliente − embalaje − publicidad/ud − coste devoluciones
Margen neto %    = Beneficio/ud ÷ Ingreso neto
ROI del pedido   = Beneficio total ÷ desembolso del pedido
Punto equilibrio = Costes fijos mensuales ÷ Beneficio/ud
Payback (meses)  = Desembolso ÷ beneficio mensual
```

**Reglas prácticas del sector** (la herramienta avisa si no las cumples):

| Regla | Umbral |
|---|---|
| Regla 3x | PVP sin IVA ≥ 3 × coste FOB (idealmente 3 × landed) |
| Margen neto | ≥ 15-20% después de comisiones y publicidad |
| ROI primera compra | ≥ 50-100% |
| Payback | ≤ 6 meses (el capital rota; si tarda más, te ahoga) |
| Comisiones típicas | Amazon ~15% + logística FBA; Stripe/PayPal ~1,5-3% |

No olvides en el modelo: devoluciones (2-5% típico), publicidad por unidad (CAC),
y tus costes fijos (cuota de autónomo, software, almacén).

## 5. Cómo puntúa la herramienta (score 0-100)

Inspirado en los opportunity scores de Jungle Scout/Helium 10, con pesos explícitos:

| Factor | Peso | Cómo puntuarlo (0-10) |
|---|---|---|
| Demanda | 25% | Búsquedas + ventas estimadas de competidores |
| Competencia | 20% | 10 = saturado (se invierte) |
| Margen neto | 25% | Automático desde la calculadora (0% → 0, 15% → 5, ≥30% → 10) |
| Tendencia | 10% | Google Trends 12-24 meses |
| Estacionalidad | 5% | 10 = solo se vende en Navidad (se invierte) |
| Logística | 10% | Peso/volumen/fragilidad/baterías (se invierte) |
| Riesgo regulatorio | 5% | CE, contacto alimentario, patentes, marcas (se invierte) |

Interpretación: **≥70** oportunidad fuerte → pide muestras · **55-69** prometedor →
sigue investigando · **40-54** dudoso · **<40** descartar.

## 6. Uso de la herramienta

Abre `index.html` en el navegador (o sírvelo con `python3 -m http.server`).

- **Ranking** — tus ideas ordenadas por score, con margen, ROI y semáforos.
  Botones para cargar 3 ejemplos y para exportar/importar tus datos en JSON.
- **Nueva idea** — ficha completa de investigación de un candidato, con el
  análisis (score + finanzas) recalculado en vivo mientras escribes.
- **Calculadora coste-beneficio** — simulación rápida sin guardar nada.

Los datos viven en el localStorage de tu navegador: exporta el JSON de vez en
cuando como copia de seguridad.

## 7. Fuentes

- [Jungle Scout – Understanding the Opportunity Score](https://support.junglescout.com/hc/en-us/articles/360015964774-Understanding-the-Opportunity-Score-in-the-Extension)
- [Helium 10 vs Jungle Scout – criterios de scoring](https://www.smartscout.com/blog/helium-10-vs-jungle-scout)
- [IncoDocs – How to Calculate the Landed Cost of Imported Products](https://incodocs.com/blog/how-to-calculate-the-landed-cost-of-imported-goods-2/)
- [CargoFromChina – Landed Cost for China Imports](https://cargofromchina.com/landed-cost/)
- [FedEx – What Is Landed Cost](https://www.fedex.com/en-us/small-business/articles-insights/what-is-landed-cost.html)
- [Alibaba Seller Blog – FOB Price & Landed Cost Guide](https://seller.alibaba.com/blogs/2026/southeast-asia/dried-fruit/fob-price-landed-cost-calculation-guide-alibaba)
- [Cosmo Sourcing – Alibaba Verified Suppliers: qué garantiza el badge](https://www.cosmosourcing.com/blog/what-are-alibaba-verified-suppliers)
- [StartupBros – How to Find Reliable Suppliers on Alibaba](https://startupbros.com/how-to-find-reliable-suppliers-on-alibaba-in-5-simple-steps/)
- [The Inspection Company – 7 pasos para auditar un fabricante de Alibaba](https://www.the-inspection-company.com/blogs/how-to-vet-an-alibaba-manufacturer-a-7-step-guide-to-finding-a-trustworthy-supplier)
- [DoDropshipping – Best Alibaba Products (criterios de selección)](https://dodropshipping.com/best-alibaba-products-for-dropshipping/)
- [Accio – Top Selling Products on Alibaba 2026 (tendencias de categoría)](https://www.accio.com/business/top-selling-products-on-alibaba-2026)
