from django.urls import path
from .views import (
    ChatbotRutinaView,
    ChatbotMensajeView,
    GuardarRutinaChatbotView,
    AnteriorView,
    HistorialEjercicioView,
    RegistroEntrenamientoListView,
    RegistroEntrenamientoDetailView,
)

urlpatterns = [
    path("chatbot/", ChatbotRutinaView.as_view(), name="chatbot-rutina"),
    path("chatbot/mensaje/", ChatbotMensajeView.as_view(), name="chatbot-mensaje"),
    path("chatbot/guardar/", GuardarRutinaChatbotView.as_view(), name="chatbot-guardar"),
    path("registros/", RegistroEntrenamientoListView.as_view(), name="registros-entrenamiento"),
    path("anterior/", AnteriorView.as_view(), name="anterior"),
    path("ejercicio-historial/", HistorialEjercicioView.as_view(), name="ejercicio-historial"),
    path("registros/<int:id>/", RegistroEntrenamientoDetailView.as_view(), name="registro-entrenamiento"),
]