"""Modelos de la app de investigacion de productos.

ProductIdea guarda toda la investigacion de un producto candidato
(mercado + proveedor + finanzas) y cachea en el modelo los resultados
calculados por services.py para poder ordenar y filtrar en BD.

Author : Adrian Crespo Musheghyan
"""

from django.db import models
from django.urls import reverse
from django.core.validators import MinValueValidator, MaxValueValidator
from django.template.defaultfilters import slugify

from .services import (FinancialInputs, ScoringInputs,
                       calculate_financials, calculate_opportunity_score)


RATING_0_10 = [MinValueValidator(0), MaxValueValidator(10)]


class ProductIdea(models.Model):
    """Un producto candidato a importar desde Alibaba y vender online."""

    STATUS_CHOICES = [
        ("researching", "Investigando"),
        ("samples", "Muestras pedidas"),
        ("ordered", "Pedido realizado"),
        ("selling", "En venta"),
        ("discarded", "Descartado"),
    ]

    # --- Identificacion ---
    name = models.CharField("Nombre del producto", max_length=200, unique=True)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    category = models.CharField("Categoria", max_length=120, blank=True)
    alibaba_url = models.URLField("URL en Alibaba", blank=True)
    supplier_name = models.CharField("Proveedor", max_length=200, blank=True)
    supplier_verified = models.BooleanField("Proveedor verificado", default=False)
    trade_assurance = models.BooleanField("Con Trade Assurance", default=False)
    moq = models.PositiveIntegerField("MOQ (pedido minimo)", default=0)
    status = models.CharField("Estado", max_length=20,
                              choices=STATUS_CHOICES, default="researching")
    notes = models.TextField("Notas de investigacion", blank=True)

    # --- Valoraciones de mercado (0-10) ---
    demand = models.FloatField(
        "Demanda (0-10)", default=5, validators=RATING_0_10,
        help_text="Volumen de busquedas/ventas estimado. 10 = altisima demanda.")
    competition = models.FloatField(
        "Competencia (0-10)", default=5, validators=RATING_0_10,
        help_text="10 = mercado saturado, 0 = sin competencia.")
    trend = models.FloatField(
        "Tendencia (0-10)", default=5, validators=RATING_0_10,
        help_text="Google Trends 12-24 meses. 10 = crecimiento sostenido.")
    seasonality = models.FloatField(
        "Estacionalidad (0-10)", default=5, validators=RATING_0_10,
        help_text="10 = solo se vende en una epoca del anyo.")
    logistics_difficulty = models.FloatField(
        "Dificultad logistica (0-10)", default=5, validators=RATING_0_10,
        help_text="Peso, volumen, fragilidad, baterias... 10 = pesadilla.")
    regulatory_risk = models.FloatField(
        "Riesgo regulatorio (0-10)", default=5, validators=RATING_0_10,
        help_text="Certificaciones CE, patentes, marcas. 10 = riesgo alto.")

    # --- Pedido al proveedor ---
    units = models.PositiveIntegerField("Unidades del pedido", default=100)
    fob_unit_price = models.FloatField("Precio FOB por unidad (EUR)", default=0)
    sample_cost = models.FloatField("Muestras/moldes/branding (EUR)", default=0)

    # --- Importacion ---
    freight_total = models.FloatField("Flete internacional (EUR)", default=0)
    insurance_total = models.FloatField("Seguro (EUR)", default=0)
    duty_pct = models.FloatField("Arancel % (sobre CIF)", default=0)
    import_vat_pct = models.FloatField("IVA importacion %", default=21)
    customs_fees = models.FloatField("Despacho de aduanas (EUR)", default=0)
    inland_transport = models.FloatField("Transporte nacional (EUR)", default=0)
    vat_recoverable = models.BooleanField(
        "IVA de importacion recuperable", default=True,
        help_text="Marcar si eres empresa/autonomo y deduces el IVA soportado.")

    # --- Venta ---
    sale_price = models.FloatField("PVP con IVA (EUR)", default=0)
    sale_vat_pct = models.FloatField("IVA de venta %", default=21)
    marketplace_fee_pct = models.FloatField(
        "Comision plataforma %", default=0,
        help_text="Amazon ~15%, tienda propia 0%.")
    payment_fee_pct = models.FloatField("Comision de pago %", default=0)
    fulfillment_per_unit = models.FloatField("Envio al cliente por unidad (EUR)", default=0)
    packaging_per_unit = models.FloatField("Embalaje por unidad (EUR)", default=0)
    marketing_per_unit = models.FloatField("Publicidad por unidad vendida (EUR)", default=0)
    returns_pct = models.FloatField("Devoluciones %", default=0)

    # --- Negocio ---
    monthly_fixed_costs = models.FloatField("Costes fijos mensuales (EUR)", default=0)
    estimated_monthly_sales = models.PositiveIntegerField(
        "Ventas mensuales estimadas (uds)", default=0)

    # --- Resultados cacheados (se recalculan en cada save) ---
    opportunity_score = models.FloatField("Puntuacion de oportunidad", default=0, editable=False)
    landed_cost_per_unit = models.FloatField("Coste aterrizado/ud", default=0, editable=False)
    profit_per_unit = models.FloatField("Beneficio/ud", default=0, editable=False)
    net_margin_pct = models.FloatField("Margen neto %", default=0, editable=False)
    roi_pct = models.FloatField("ROI del pedido %", default=0, editable=False)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-opportunity_score"]
        verbose_name = "Idea de producto"
        verbose_name_plural = "Ideas de producto"

    def __str__(self):
        return "%s (score %.1f)" % (self.name, self.opportunity_score)

    def get_absolute_url(self):
        return reverse("market_research:product_detail", kwargs={"slug": self.slug})

    # ------------------------------------------------------------------
    # Calculo
    # ------------------------------------------------------------------
    def financial_inputs(self):
        return FinancialInputs(
            units=self.units,
            fob_unit_price=self.fob_unit_price,
            sample_cost=self.sample_cost,
            freight_total=self.freight_total,
            insurance_total=self.insurance_total,
            duty_pct=self.duty_pct,
            import_vat_pct=self.import_vat_pct,
            customs_fees=self.customs_fees,
            inland_transport=self.inland_transport,
            vat_recoverable=self.vat_recoverable,
            sale_price=self.sale_price,
            sale_vat_pct=self.sale_vat_pct,
            marketplace_fee_pct=self.marketplace_fee_pct,
            payment_fee_pct=self.payment_fee_pct,
            fulfillment_per_unit=self.fulfillment_per_unit,
            packaging_per_unit=self.packaging_per_unit,
            marketing_per_unit=self.marketing_per_unit,
            returns_pct=self.returns_pct,
            monthly_fixed_costs=self.monthly_fixed_costs,
            estimated_monthly_sales=self.estimated_monthly_sales,
        )

    def financials(self):
        """Resultados financieros completos (FinancialResults)."""
        return calculate_financials(self.financial_inputs())

    def scoring(self):
        """Puntuacion de oportunidad con desglose (dict)."""
        return calculate_opportunity_score(ScoringInputs(
            demand=self.demand,
            competition=self.competition,
            trend=self.trend,
            seasonality=self.seasonality,
            logistics_difficulty=self.logistics_difficulty,
            regulatory_risk=self.regulatory_risk,
            net_margin_pct=self.financials().net_margin_pct,
        ))

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        fin = self.financials()
        self.landed_cost_per_unit = fin.landed_cost_per_unit
        self.profit_per_unit = fin.profit_per_unit
        self.net_margin_pct = fin.net_margin_pct
        self.roi_pct = fin.roi_pct
        self.opportunity_score = self.scoring()["score"]
        super().save(*args, **kwargs)
