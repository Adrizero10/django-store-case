"""Tests de la app de investigacion de productos.

Author : Adrian Crespo Musheghyan
"""

from django.test import TestCase
from django.urls import reverse

from .models import ProductIdea
from .services import (FinancialInputs, ScoringInputs,
                       calculate_financials, calculate_opportunity_score)


class FinancialCalculatorTests(TestCase):
    """Verifica las formulas de landed cost y unit economics con numeros conocidos."""

    def base_inputs(self):
        return FinancialInputs(
            units=100, fob_unit_price=2.0, sample_cost=50,
            freight_total=100, insurance_total=0,
            duty_pct=10, import_vat_pct=21,
            customs_fees=50, inland_transport=0,
            vat_recoverable=True,
            sale_price=24.2, sale_vat_pct=21,
            marketplace_fee_pct=0, payment_fee_pct=0,
            fulfillment_per_unit=0, packaging_per_unit=0,
            marketing_per_unit=0, returns_pct=0,
        )

    def test_landed_cost_chain(self):
        res = calculate_financials(self.base_inputs())
        # FOB 200 + flete 100 = CIF 300; arancel 10% = 30; IVA 21% de 330 = 69.3
        self.assertEqual(res.goods_value, 200.0)
        self.assertEqual(res.cif_value, 300.0)
        self.assertEqual(res.duty_amount, 30.0)
        self.assertEqual(res.import_vat_amount, 69.3)
        # landed (IVA recuperable) = 300 + 30 + 50 + 50 = 430 -> 4.30 EUR/ud
        self.assertEqual(res.landed_cost_total, 430.0)
        self.assertEqual(res.landed_cost_per_unit, 4.30)
        # desembolso = 430 + 69.3
        self.assertEqual(res.total_cash_outlay, 499.3)

    def test_vat_not_recoverable_increases_landed_cost(self):
        inp = self.base_inputs()
        inp.vat_recoverable = False
        res = calculate_financials(inp)
        self.assertEqual(res.landed_cost_total, 499.3)
        self.assertGreater(res.landed_cost_per_unit, 4.30)

    def test_unit_economics(self):
        res = calculate_financials(self.base_inputs())
        # PVP 24.20 con IVA -> ingreso neto 20.00; beneficio = 20 - 4.30
        self.assertEqual(res.net_revenue_per_unit, 20.0)
        self.assertEqual(res.profit_per_unit, 15.70)
        self.assertEqual(res.net_margin_pct, 78.5)
        self.assertEqual(res.total_profit_order, 1570.0)
        self.assertEqual(res.roi_pct, round(1570.0 * 100 / 499.3, 2))

    def test_returns_and_fees_reduce_profit(self):
        inp = self.base_inputs()
        inp.marketplace_fee_pct = 15
        inp.returns_pct = 10
        res = calculate_financials(inp)
        self.assertEqual(res.marketplace_fee_per_unit, round(24.2 * 0.15, 2))
        self.assertEqual(res.returns_cost_per_unit, 0.43)
        self.assertLess(res.profit_per_unit, 15.70)

    def test_breakeven_and_payback(self):
        inp = self.base_inputs()
        inp.monthly_fixed_costs = 157
        inp.estimated_monthly_sales = 20
        res = calculate_financials(inp)
        self.assertEqual(res.breakeven_units, 10)  # ceil(157 / 15.70)
        # beneficio mensual = 15.70*20 - 157 = 157 -> payback = 499.3/157
        self.assertEqual(res.payback_months, round(499.3 / 157.0, 2))

    def test_losing_product_warns(self):
        inp = self.base_inputs()
        inp.sale_price = 4.0
        res = calculate_financials(inp)
        self.assertLess(res.profit_per_unit, 0)
        self.assertTrue(any("Pierdes dinero" in w for w in res.warnings))

    def test_3x_rule_warning(self):
        inp = self.base_inputs()
        inp.sale_price = 6.0  # neto ~4.96 < 3 * FOB(2.0)
        res = calculate_financials(inp)
        self.assertTrue(any("regla 3x" in w for w in res.warnings))


class OpportunityScoreTests(TestCase):

    def test_score_bounds(self):
        best = calculate_opportunity_score(ScoringInputs(
            demand=10, competition=0, trend=10, seasonality=0,
            logistics_difficulty=0, regulatory_risk=0, net_margin_pct=40))
        worst = calculate_opportunity_score(ScoringInputs(
            demand=0, competition=10, trend=0, seasonality=10,
            logistics_difficulty=10, regulatory_risk=10, net_margin_pct=-5))
        self.assertEqual(best["score"], 100.0)
        self.assertEqual(worst["score"], 0.0)

    def test_margin_mapping(self):
        mid = calculate_opportunity_score(ScoringInputs(net_margin_pct=15))
        self.assertEqual(mid["breakdown"]["margin"], 5.0)
        top = calculate_opportunity_score(ScoringInputs(net_margin_pct=35))
        self.assertEqual(top["breakdown"]["margin"], 10.0)

    def test_out_of_range_values_are_clamped(self):
        res = calculate_opportunity_score(ScoringInputs(
            demand=25, competition=-4, net_margin_pct=20))
        self.assertEqual(res["breakdown"]["demand"], 10.0)
        self.assertEqual(res["breakdown"]["competition"], 10.0)


class ProductIdeaModelTests(TestCase):

    def make_idea(self, **kwargs):
        defaults = dict(
            name="Producto test", units=100, fob_unit_price=2.0,
            freight_total=100, duty_pct=10, customs_fees=50, sample_cost=50,
            sale_price=24.2, demand=8, competition=3, trend=7,
            seasonality=2, logistics_difficulty=2, regulatory_risk=2)
        defaults.update(kwargs)
        return ProductIdea.objects.create(**defaults)

    def test_save_caches_computed_fields(self):
        idea = self.make_idea()
        self.assertEqual(idea.slug, "producto-test")
        self.assertEqual(idea.landed_cost_per_unit, 4.30)
        self.assertEqual(idea.profit_per_unit, 15.70)
        self.assertGreater(idea.opportunity_score, 70)

    def test_ordering_by_score(self):
        good = self.make_idea()
        bad = self.make_idea(name="Producto malo", sale_price=5.0,
                             demand=2, competition=9)
        ranked = list(ProductIdea.objects.all())
        self.assertEqual(ranked[0], good)
        self.assertEqual(ranked[1], bad)


class ViewTests(TestCase):

    def setUp(self):
        self.idea = ProductIdea.objects.create(
            name="Funda test", units=100, fob_unit_price=1.5,
            freight_total=80, sale_price=15.0, demand=7)

    def test_dashboard(self):
        response = self.client.get(reverse("market_research:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Funda test")

    def test_detail(self):
        response = self.client.get(self.idea.get_absolute_url())
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Coste aterrizado")

    def test_calculator_get_and_post(self):
        url = reverse("market_research:calculator")
        self.assertEqual(self.client.get(url).status_code, 200)
        response = self.client.post(url, {
            "units": 100, "fob_unit_price": 2.0, "sale_price": 24.2,
            "import_vat_pct": 21, "sale_vat_pct": 21,
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Beneficio del pedido completo")

    def test_create_view(self):
        response = self.client.post(reverse("market_research:product_create"), {
            "name": "Nueva idea", "status": "researching",
            "demand": 6, "competition": 5, "trend": 5, "seasonality": 5,
            "logistics_difficulty": 5, "regulatory_risk": 5,
            "units": 100, "fob_unit_price": 3, "sample_cost": 0,
            "freight_total": 100, "insurance_total": 0, "duty_pct": 5,
            "import_vat_pct": 21, "customs_fees": 0, "inland_transport": 0,
            "vat_recoverable": "on", "moq": 0,
            "sale_price": 20, "sale_vat_pct": 21, "marketplace_fee_pct": 0,
            "payment_fee_pct": 0, "fulfillment_per_unit": 0,
            "packaging_per_unit": 0, "marketing_per_unit": 0, "returns_pct": 0,
            "monthly_fixed_costs": 0, "estimated_monthly_sales": 0,
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(ProductIdea.objects.filter(name="Nueva idea").exists())
