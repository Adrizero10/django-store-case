"""Motor de calculo financiero y de scoring para investigacion de productos.

Logica pura (sin dependencias de Django) para poder testearla y reutilizarla
fuera del ORM. Dos piezas:

  * calculate_financials: unit economics completos de un pedido de
    importacion (Alibaba -> venta online): coste aterrizado (landed cost),
    margenes, ROI, punto de equilibrio y payback.
  * calculate_opportunity_score: puntuacion 0-100 del potencial de un
    producto combinando demanda, competencia, margen, tendencia,
    estacionalidad, logistica y riesgo regulatorio.

Metodologia documentada en INVESTIGACION_PRODUCTOS.md (raiz del repo).

Author : Adrian Crespo Musheghyan
"""

from dataclasses import dataclass, field


# ---------------------------------------------------------------------------
# Calculadora financiera (unit economics de importacion)
# ---------------------------------------------------------------------------

@dataclass
class FinancialInputs:
    """Entradas de la calculadora. Importes en la misma divisa (EUR).

    El flujo modelado es el estandar de importacion desde China con
    incoterm FOB: mercancia + flete + seguro = CIF; sobre el CIF se
    aplica el arancel y sobre (CIF + arancel) el IVA de importacion.
    """

    # --- Pedido al proveedor ---
    units: int = 100                      # unidades del pedido (>= MOQ)
    fob_unit_price: float = 0.0           # precio FOB por unidad
    sample_cost: float = 0.0              # muestras, moldes, branding (coste fijo del pedido)

    # --- Transporte internacional e importacion ---
    freight_total: float = 0.0            # flete internacional del envio completo
    insurance_total: float = 0.0          # seguro de la mercancia
    duty_pct: float = 0.0                 # arancel % sobre valor CIF
    import_vat_pct: float = 21.0          # IVA de importacion % sobre CIF + arancel
    customs_fees: float = 0.0             # despacho de aduanas / agente / tasas portuarias
    inland_transport: float = 0.0         # transporte nacional hasta tu almacen
    vat_recoverable: bool = True          # True si eres empresa/autonomo y deduces el IVA soportado

    # --- Venta por unidad ---
    sale_price: float = 0.0               # PVP con IVA incluido
    sale_vat_pct: float = 21.0            # IVA repercutido en la venta
    marketplace_fee_pct: float = 0.0      # comision de la plataforma (Amazon ~15%) sobre PVP
    payment_fee_pct: float = 0.0          # comision de pago (Stripe/PayPal) sobre PVP
    fulfillment_per_unit: float = 0.0     # envio al cliente / logistica FBA por unidad
    packaging_per_unit: float = 0.0       # embalaje por unidad
    marketing_per_unit: float = 0.0       # coste publicitario medio por unidad vendida (CAC)
    returns_pct: float = 0.0              # % de pedidos devueltos (se asume producto perdido)

    # --- Contexto del negocio ---
    monthly_fixed_costs: float = 0.0      # suscripciones, almacen, cuota autonomo...
    estimated_monthly_sales: int = 0      # unidades/mes estimadas (para payback)


@dataclass
class FinancialResults:
    """Salida de la calculadora, todos los importes redondeados a 2 decimales."""

    # Pedido / importacion
    goods_value: float = 0.0              # valor FOB de la mercancia
    cif_value: float = 0.0                # FOB + flete + seguro
    duty_amount: float = 0.0
    import_vat_amount: float = 0.0
    total_cash_outlay: float = 0.0        # desembolso total del pedido (con IVA import.)
    landed_cost_total: float = 0.0        # coste imputable (sin IVA si es recuperable)
    landed_cost_per_unit: float = 0.0

    # Unit economics
    net_revenue_per_unit: float = 0.0     # PVP sin IVA
    marketplace_fee_per_unit: float = 0.0
    payment_fee_per_unit: float = 0.0
    returns_cost_per_unit: float = 0.0
    variable_cost_per_unit: float = 0.0   # todos los costes variables (incluye landed)
    profit_per_unit: float = 0.0
    gross_margin_pct: float = 0.0         # (ingreso neto - landed) / ingreso neto
    net_margin_pct: float = 0.0           # beneficio / ingreso neto
    markup_pct: float = 0.0               # beneficio / coste

    # Del pedido completo
    total_profit_order: float = 0.0       # si se vende todo el pedido
    roi_pct: float = 0.0                  # beneficio pedido / desembolso
    breakeven_units: int = 0              # unidades/mes para cubrir costes fijos
    payback_months: float = 0.0           # meses para recuperar el desembolso
    warnings: list = field(default_factory=list)


def _r(value):
    return round(value, 2)


def calculate_financials(inp: FinancialInputs) -> FinancialResults:
    """Calcula el coste aterrizado y los unit economics de un pedido.

    Formulas (ver INVESTIGACION_PRODUCTOS.md, seccion 4):
      CIF     = FOB total + flete + seguro
      Arancel = CIF * duty_pct
      IVA imp = (CIF + arancel) * import_vat_pct
      Landed  = CIF + arancel + despacho + transporte interior + fijos pedido
                (+ IVA de importacion solo si NO es recuperable)
    """
    res = FinancialResults()
    units = max(int(inp.units), 1)

    # --- Importacion ---
    res.goods_value = _r(inp.fob_unit_price * units)
    res.cif_value = _r(res.goods_value + inp.freight_total + inp.insurance_total)
    res.duty_amount = _r(res.cif_value * inp.duty_pct / 100.0)
    res.import_vat_amount = _r(
        (res.cif_value + res.duty_amount) * inp.import_vat_pct / 100.0)

    base_landed = (res.cif_value + res.duty_amount + inp.customs_fees +
                   inp.inland_transport + inp.sample_cost)
    res.total_cash_outlay = _r(base_landed + res.import_vat_amount)
    res.landed_cost_total = _r(
        base_landed if inp.vat_recoverable else base_landed + res.import_vat_amount)
    res.landed_cost_per_unit = _r(res.landed_cost_total / units)

    # --- Unit economics ---
    vat_divisor = 1.0 + inp.sale_vat_pct / 100.0
    res.net_revenue_per_unit = _r(inp.sale_price / vat_divisor)
    res.marketplace_fee_per_unit = _r(inp.sale_price * inp.marketplace_fee_pct / 100.0)
    res.payment_fee_per_unit = _r(inp.sale_price * inp.payment_fee_pct / 100.0)

    # Una devolucion pierde el producto y sus costes de envio: se reparte
    # ese coste esperado entre todas las unidades vendidas.
    per_sale_cost_base = (res.landed_cost_per_unit + inp.fulfillment_per_unit +
                          inp.packaging_per_unit)
    res.returns_cost_per_unit = _r(per_sale_cost_base * inp.returns_pct / 100.0)

    res.variable_cost_per_unit = _r(
        per_sale_cost_base + res.marketplace_fee_per_unit +
        res.payment_fee_per_unit + inp.marketing_per_unit +
        res.returns_cost_per_unit)

    res.profit_per_unit = _r(res.net_revenue_per_unit - res.variable_cost_per_unit)

    if res.net_revenue_per_unit > 0:
        res.gross_margin_pct = _r(
            (res.net_revenue_per_unit - res.landed_cost_per_unit) * 100.0 /
            res.net_revenue_per_unit)
        res.net_margin_pct = _r(res.profit_per_unit * 100.0 / res.net_revenue_per_unit)
    if res.variable_cost_per_unit > 0:
        res.markup_pct = _r(res.profit_per_unit * 100.0 / res.variable_cost_per_unit)

    # --- Pedido completo ---
    res.total_profit_order = _r(res.profit_per_unit * units)
    if res.total_cash_outlay > 0:
        res.roi_pct = _r(res.total_profit_order * 100.0 / res.total_cash_outlay)

    if res.profit_per_unit > 0:
        if inp.monthly_fixed_costs > 0:
            import math
            res.breakeven_units = int(math.ceil(
                inp.monthly_fixed_costs / res.profit_per_unit))
        if inp.estimated_monthly_sales > 0:
            monthly_profit = (res.profit_per_unit * inp.estimated_monthly_sales -
                              inp.monthly_fixed_costs)
            if monthly_profit > 0:
                res.payback_months = _r(res.total_cash_outlay / monthly_profit)

    # --- Avisos automaticos (reglas practicas del sector) ---
    if res.net_margin_pct < 0:
        res.warnings.append("Pierdes dinero con cada venta: sube el PVP, "
                            "negocia el FOB o descarta el producto.")
    elif res.net_margin_pct < 15:
        res.warnings.append("Margen neto inferior al 15%%: muy justo para "
                            "absorber publicidad, devoluciones e imprevistos.")
    if inp.sale_price > 0 and inp.fob_unit_price > 0:
        ratio = res.net_revenue_per_unit / max(inp.fob_unit_price, 0.01)
        if ratio < 3:
            res.warnings.append("No cumples la regla 3x (PVP neto >= 3 veces "
                                "el coste FOB), habitual como minimo de seguridad.")
    if res.payback_months > 6:
        res.warnings.append("Payback superior a 6 meses: capital inmovilizado "
                            "demasiado tiempo para una primera importacion.")
    return res


# ---------------------------------------------------------------------------
# Scoring de oportunidad (0-100)
# ---------------------------------------------------------------------------

# Pesos inspirados en los "opportunity scores" de Jungle Scout / Helium 10:
# demanda y margen mandan, competencia penaliza, y logistica/riesgo ajustan.
SCORE_WEIGHTS = {
    "demand": 0.25,
    "competition": 0.20,
    "margin": 0.25,
    "trend": 0.10,
    "seasonality": 0.05,
    "logistics": 0.10,
    "risk": 0.05,
}


@dataclass
class ScoringInputs:
    """Valoraciones 0-10 recogidas durante la investigacion de mercado.

    Las escalas estan definidas para que MAS SIEMPRE SEA MEJOR salvo donde
    se indica lo contrario (competition, seasonality, logistics y risk se
    puntuan como intensidad del problema y aqui se invierten).
    """

    demand: float = 5.0          # volumen de busquedas/ventas estimado (10 = altisimo)
    competition: float = 5.0     # intensidad competitiva (10 = saturado) -> se invierte
    trend: float = 5.0           # Google Trends: 10 = crecimiento sostenido
    seasonality: float = 5.0     # 10 = extremadamente estacional -> se invierte
    logistics_difficulty: float = 5.0  # peso/volumen/fragilidad (10 = pesadilla) -> se invierte
    regulatory_risk: float = 5.0       # certificaciones/patentes/marcas (10 = alto) -> se invierte
    net_margin_pct: float = 0.0        # viene de la calculadora financiera


def _clamp(value, lo=0.0, hi=10.0):
    return max(lo, min(hi, float(value)))


def _margin_to_score(net_margin_pct):
    """Mapea margen neto %% a escala 0-10.

    < 0%% -> 0 | 15%% -> 5 (minimo aceptable) | >= 30%% -> 10 (excelente).
    Lineal entre tramos.
    """
    if net_margin_pct <= 0:
        return 0.0
    if net_margin_pct >= 30:
        return 10.0
    if net_margin_pct <= 15:
        return net_margin_pct / 15.0 * 5.0
    return 5.0 + (net_margin_pct - 15.0) / 15.0 * 5.0


def calculate_opportunity_score(inp: ScoringInputs) -> dict:
    """Devuelve {'score': 0-100, 'verdict': str, 'breakdown': {...}}."""
    breakdown = {
        "demand": _clamp(inp.demand),
        "competition": 10.0 - _clamp(inp.competition),
        "margin": _margin_to_score(inp.net_margin_pct),
        "trend": _clamp(inp.trend),
        "seasonality": 10.0 - _clamp(inp.seasonality),
        "logistics": 10.0 - _clamp(inp.logistics_difficulty),
        "risk": 10.0 - _clamp(inp.regulatory_risk),
    }
    score = round(sum(breakdown[k] * SCORE_WEIGHTS[k] for k in SCORE_WEIGHTS) * 10, 1)

    if score >= 70:
        verdict = "Oportunidad fuerte: pide muestras y valida con un pedido pequeno."
    elif score >= 55:
        verdict = "Prometedor: investiga mas (competencia real, resenas, costes)."
    elif score >= 40:
        verdict = "Dudoso: solo si puedes diferenciarte o mejorar el margen."
    else:
        verdict = "Descartar: demanda/margen insuficientes o riesgo excesivo."

    return {"score": score, "verdict": verdict, "breakdown": breakdown}
