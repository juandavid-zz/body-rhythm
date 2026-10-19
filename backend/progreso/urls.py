from django.urls import path

from .views import ProgresoView, RegistrarPesoView

urlpatterns = [
    path('', ProgresoView.as_view()),
    path('peso/', RegistrarPesoView.as_view()),
]
