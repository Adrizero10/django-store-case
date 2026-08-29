"""Vistas de la app de investigacion de productos.

Author : Adrian Crespo Musheghyan
"""

from django.contrib import messages
from django.shortcuts import render, redirect, get_object_or_404

from .models import ProductIdea
from .forms import ProductIdeaForm, QuickCalculatorForm
from .services import calculate_financials, SCORE_WEIGHTS


def dashboard(request):
    """Ranking de ideas de producto ordenadas por puntuacion de oportunidad."""
    ideas = ProductIdea.objects.all()
    status = request.GET.get("status")
    if status:
        ideas = ideas.filter(status=status)
    context = {
        "ideas": ideas,
        "status_selected": status or "",
        "status_choices": ProductIdea.STATUS_CHOICES,
    }
    return render(request, "market_research/dashboard.html", context)


def product_detail(request, slug):
    """Ficha completa: scoring desglosado + analisis financiero."""
    idea = get_object_or_404(ProductIdea, slug=slug)
    fin = idea.financials()
    scoring = idea.scoring()
    weights_pct = {k: int(v * 100) for k, v in SCORE_WEIGHTS.items()}
    return render(request, "market_research/product_detail.html", {
        "idea": idea,
        "fin": fin,
        "scoring": scoring,
        "weights_pct": weights_pct,
    })


def product_create(request):
    return _product_form(request, None)


def product_edit(request, slug):
    idea = get_object_or_404(ProductIdea, slug=slug)
    return _product_form(request, idea)


def _product_form(request, idea):
    if request.method == "POST":
        form = ProductIdeaForm(request.POST, instance=idea)
        if form.is_valid():
            idea = form.save()
            messages.success(request, "Producto '%s' guardado y recalculado." % idea.name)
            return redirect(idea.get_absolute_url())
    else:
        form = ProductIdeaForm(instance=idea)
    return render(request, "market_research/product_form.html",
                  {"form": form, "idea": idea})


def product_delete(request, slug):
    idea = get_object_or_404(ProductIdea, slug=slug)
    if request.method == "POST":
        name = idea.name
        idea.delete()
        messages.success(request, "Producto '%s' eliminado." % name)
        return redirect("market_research:dashboard")
    return render(request, "market_research/product_confirm_delete.html", {"idea": idea})


def calculator(request):
    """Calculadora rapida de coste-beneficio, sin guardar en BD."""
    results = None
    if request.method == "POST":
        form = QuickCalculatorForm(request.POST)
        if form.is_valid():
            results = calculate_financials(form.to_inputs())
    else:
        form = QuickCalculatorForm()
    return render(request, "market_research/calculator.html",
                  {"form": form, "results": results})
