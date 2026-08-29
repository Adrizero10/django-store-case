"""Formularios de la app de investigacion de productos.

Author : Adrian Crespo Musheghyan
"""

from django import forms

from .models import ProductIdea
from .services import FinancialInputs


class ProductIdeaForm(forms.ModelForm):
    """Alta/edicion completa de una idea de producto."""

    class Meta:
        model = ProductIdea
        exclude = ["slug", "opportunity_score", "landed_cost_per_unit",
                   "profit_per_unit", "net_margin_pct", "roi_pct",
                   "created", "updated"]


class QuickCalculatorForm(forms.Form):
    """Calculadora rapida de coste-beneficio sin guardar nada en BD."""

    units = forms.IntegerField(label="Unidades del pedido", min_value=1, initial=100)
    fob_unit_price = forms.FloatField(label="Precio FOB por unidad (EUR)", min_value=0)
    sample_cost = forms.FloatField(label="Muestras/moldes (EUR)", min_value=0,
                                   initial=0, required=False)
    freight_total = forms.FloatField(label="Flete internacional (EUR)", min_value=0,
                                     initial=0, required=False)
    insurance_total = forms.FloatField(label="Seguro (EUR)", min_value=0,
                                       initial=0, required=False)
    duty_pct = forms.FloatField(label="Arancel % (sobre CIF)", min_value=0,
                                initial=0, required=False)
    import_vat_pct = forms.FloatField(label="IVA importacion %", min_value=0, initial=21)
    customs_fees = forms.FloatField(label="Despacho de aduanas (EUR)", min_value=0,
                                    initial=0, required=False)
    inland_transport = forms.FloatField(label="Transporte nacional (EUR)", min_value=0,
                                        initial=0, required=False)
    vat_recoverable = forms.BooleanField(label="IVA de importacion recuperable",
                                         initial=True, required=False)
    sale_price = forms.FloatField(label="PVP con IVA (EUR)", min_value=0)
    sale_vat_pct = forms.FloatField(label="IVA de venta %", min_value=0, initial=21)
    marketplace_fee_pct = forms.FloatField(label="Comision plataforma %", min_value=0,
                                           initial=0, required=False)
    payment_fee_pct = forms.FloatField(label="Comision de pago %", min_value=0,
                                       initial=0, required=False)
    fulfillment_per_unit = forms.FloatField(label="Envio al cliente/ud (EUR)",
                                            min_value=0, initial=0, required=False)
    packaging_per_unit = forms.FloatField(label="Embalaje/ud (EUR)", min_value=0,
                                          initial=0, required=False)
    marketing_per_unit = forms.FloatField(label="Publicidad/ud vendida (EUR)",
                                          min_value=0, initial=0, required=False)
    returns_pct = forms.FloatField(label="Devoluciones %", min_value=0,
                                   initial=0, required=False)
    monthly_fixed_costs = forms.FloatField(label="Costes fijos mensuales (EUR)",
                                           min_value=0, initial=0, required=False)
    estimated_monthly_sales = forms.IntegerField(label="Ventas mensuales estimadas (uds)",
                                                 min_value=0, initial=0, required=False)

    def to_inputs(self):
        """Convierte el formulario validado en FinancialInputs."""
        data = {k: (v if v not in (None, "") else 0)
                for k, v in self.cleaned_data.items()}
        data["vat_recoverable"] = bool(self.cleaned_data.get("vat_recoverable"))
        return FinancialInputs(**data)
