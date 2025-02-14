from django.views.generic import RedirectView
from django.urls import path
from . import views


# Author : Adrian Crespo Musheghyan
#
# Catalog urls
#
urlpatterns = [
    path('', RedirectView.as_view(url='home/'), name='start'),
    path('home/', views.homeCasesListView, name='home'),
    path('home/search', views.homeCasesSearchView.as_view(), name='search'),
    path('catalog/<slug:slug>', views.detail, name='detail'),
    path('500/', views.pag_error500, name='error500'),
    path('add_comment/', views.add_comment, name='add_comment'),
    path('lupita/', views.lupita, name='lupita'),

]
