"""URLs de la app de investigacion de productos.

Author : Adrian Crespo Musheghyan
"""

from django.urls import path

from . import views

app_name = "market_research"

urlpatterns = [
    path("", views.dashboard, name="dashboard"),
    path("calculadora/", views.calculator, name="calculator"),
    path("producto/nuevo/", views.product_create, name="product_create"),
    path("producto/<slug:slug>/", views.product_detail, name="product_detail"),
    path("producto/<slug:slug>/editar/", views.product_edit, name="product_edit"),
    path("producto/<slug:slug>/eliminar/", views.product_delete, name="product_delete"),
]
