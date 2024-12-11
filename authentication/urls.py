from django.conf.urls import include
from django.urls import path
from . import views

# Author : Adrian Crespo Musheghyan
#
# Authentication urls
#
urlpatterns = [
    path('accounts/', include('django.contrib.auth.urls')),
    path('signup/', views.signup, name='signup'),
]
