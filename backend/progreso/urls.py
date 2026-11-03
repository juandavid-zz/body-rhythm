from django.urls import path

from .views import MedidaDetalleView, MedidasView, ProgresoView, RegistrarPesoView

urlpatterns = [
    path('', ProgresoView.as_view()),
    path('peso/', RegistrarPesoView.as_view()),
    path('medidas/', MedidasView.as_view()),
    path('medidas/<int:id>/', MedidaDetalleView.as_view()),
]
