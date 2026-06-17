from django.urls import path
from .views import (
    EjercicioListView, EjercicioDetailView,
    RutinaListView, RutinaDetailView,
    RutinaFavoritaView, AgregarEjercicioRutinaView
)

urlpatterns = [
    # Ejercicios
    path('ejercicios/', EjercicioListView.as_view()),
    path('ejercicios/<int:pk>/', EjercicioDetailView.as_view()),

    # Rutinas por usuario
    path('usuarios/<int:usuario_id>/rutinas/', RutinaListView.as_view()),
    path('usuarios/<int:usuario_id>/rutinas/<int:pk>/', RutinaDetailView.as_view()),
    path('usuarios/<int:usuario_id>/rutinas/<int:pk>/favorita/', RutinaFavoritaView.as_view()),
    path('usuarios/<int:usuario_id>/rutinas/<int:pk>/ejercicios/', AgregarEjercicioRutinaView.as_view()),
]