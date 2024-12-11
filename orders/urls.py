from django.urls import path, include
from . import views

# Author : Adrian Crespo Musheghyan
#
# Orders urls
#
urlpatterns = [
    path('', views.get_cart, name='cart_list'),
    path('add/<slug:slug>', views.cart_add, name='cart_add'),
    path('remove/<slug:slug>', views.cart_remove, name='cart_remove'),
    path('order_create/', views.order_create, name='order_create'),
    path('order_created/', views.order_created, name='order_created'),
    path('payment-sucess/', views.PaymentSuccessful, name='payment-success'),
    path('payment-failed/', views.PaymentFailed, name='payment-failed'),
    path('', views.handle_paypal_ipn, name='paypal-ipn'),
    path('paypal/', include('paypal.standard.ipn.urls')),
    path('create-payment-intent/', views.create_payment_intent, name='create_payment_intent'),
    path('about/', views.about, name='about'),

]
