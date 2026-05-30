from django.urls import path
from .views import MiRutinaView, EjerciciosView

urlpatterns = [
    path('mi-rutina/', MiRutinaView.as_view()),
    path('ejercicios/', EjerciciosView.as_view()),
]
