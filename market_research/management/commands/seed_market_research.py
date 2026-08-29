"""Carga ideas de producto de ejemplo para probar la herramienta.

Uso: python manage.py seed_market_research

Author : Adrian Crespo Musheghyan
"""

from django.core.management.base import BaseCommand

from market_research.models import ProductIdea


EXAMPLES = [
    dict(
        name="Funda iPhone magnetica MagSafe",
        category="Accesorios movil",
        supplier_name="Shenzhen Case Factory",
        supplier_verified=True, trade_assurance=True, moq=100,
        demand=8, competition=9, trend=6, seasonality=2,
        logistics_difficulty=1, regulatory_risk=2,
        units=300, fob_unit_price=1.2, sample_cost=40,
        freight_total=120, insurance_total=10, duty_pct=6.5,
        customs_fees=60, inland_transport=30,
        sale_price=14.99, marketplace_fee_pct=0, payment_fee_pct=2.9,
        fulfillment_per_unit=2.5, packaging_per_unit=0.3,
        marketing_per_unit=1.5, returns_pct=3,
        monthly_fixed_costs=120, estimated_monthly_sales=80,
        notes="Mercado saturado pero conocido: encaja con la tienda actual.",
    ),
    dict(
        name="Botella termica acero 750ml personalizada",
        category="Hogar / deporte",
        supplier_name="Zhejiang Drinkware Co.",
        supplier_verified=True, trade_assurance=True, moq=200,
        demand=7, competition=6, trend=7, seasonality=3,
        logistics_difficulty=4, regulatory_risk=4,
        units=200, fob_unit_price=2.8, sample_cost=60,
        freight_total=260, insurance_total=15, duty_pct=6,
        customs_fees=80, inland_transport=40,
        sale_price=24.99, marketplace_fee_pct=15, payment_fee_pct=0,
        fulfillment_per_unit=3.2, packaging_per_unit=0.5,
        marketing_per_unit=2.5, returns_pct=4,
        monthly_fixed_costs=150, estimated_monthly_sales=60,
        notes="Requiere declaracion de contacto alimentario (LFGB/FDA).",
    ),
    dict(
        name="Organizador de escritorio de bambu",
        category="Oficina",
        supplier_name="Fujian Bamboo Crafts",
        supplier_verified=False, trade_assurance=True, moq=100,
        demand=6, competition=4, trend=7, seasonality=2,
        logistics_difficulty=6, regulatory_risk=2,
        units=150, fob_unit_price=4.5, sample_cost=35,
        freight_total=380, insurance_total=20, duty_pct=0,
        customs_fees=90, inland_transport=45,
        sale_price=34.99, marketplace_fee_pct=15, payment_fee_pct=0,
        fulfillment_per_unit=4.5, packaging_per_unit=0.8,
        marketing_per_unit=3, returns_pct=5,
        monthly_fixed_costs=150, estimated_monthly_sales=40,
        notes="Voluminoso: el flete pesa mucho en el coste. Nicho menos saturado.",
    ),
]


class Command(BaseCommand):
    help = "Crea ideas de producto de ejemplo (idempotente)."

    def handle(self, *args, **options):
        created = 0
        for data in EXAMPLES:
            obj, was_created = ProductIdea.objects.get_or_create(
                name=data["name"], defaults=data)
            if not was_created:
                for key, value in data.items():
                    setattr(obj, key, value)
                obj.save()
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(
            "%d ideas creadas, %d actualizadas." % (created, len(EXAMPLES) - created)))
