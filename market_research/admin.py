"""Admin de la app de investigacion de productos.

Author : Adrian Crespo Musheghyan
"""

from django.contrib import admin

from .models import ProductIdea


@admin.register(ProductIdea)
class ProductIdeaAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "opportunity_score", "landed_cost_per_unit",
                    "profit_per_unit", "net_margin_pct", "roi_pct", "updated")
    list_filter = ("status", "category", "supplier_verified", "trade_assurance")
    search_fields = ("name", "category", "supplier_name")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("opportunity_score", "landed_cost_per_unit",
                       "profit_per_unit", "net_margin_pct", "roi_pct",
                       "created", "updated")
    fieldsets = (
        ("Identificacion", {"fields": (
            "name", "slug", "category", "status", "notes")}),
        ("Proveedor (Alibaba)", {"fields": (
            "alibaba_url", "supplier_name", "supplier_verified",
            "trade_assurance", "moq")}),
        ("Valoraciones de mercado (0-10)", {"fields": (
            "demand", "competition", "trend", "seasonality",
            "logistics_difficulty", "regulatory_risk")}),
        ("Pedido e importacion", {"fields": (
            "units", "fob_unit_price", "sample_cost", "freight_total",
            "insurance_total", "duty_pct", "import_vat_pct", "customs_fees",
            "inland_transport", "vat_recoverable")}),
        ("Venta", {"fields": (
            "sale_price", "sale_vat_pct", "marketplace_fee_pct",
            "payment_fee_pct", "fulfillment_per_unit", "packaging_per_unit",
            "marketing_per_unit", "returns_pct")}),
        ("Negocio", {"fields": (
            "monthly_fixed_costs", "estimated_monthly_sales")}),
        ("Resultados calculados", {"fields": (
            "opportunity_score", "landed_cost_per_unit", "profit_per_unit",
            "net_margin_pct", "roi_pct", "created", "updated")}),
    )
