from django.urls import path
from .views import (
    ChatbotRutinaView,
    ChatbotMensajeView,
    RegistroEntrenamientoListView,
    RegistroEntrenamientoDetailView,
)

urlpatterns = [
    path("chatbot/", ChatbotRutinaView.as_view(), name="chatbot-rutina"),
    path("chatbot/mensaje/", ChatbotMensajeView.as_view(), name="chatbot-mensaje"),
    path("registros/", RegistroEntrenamientoListView.as_view(), name="registros-entrenamiento"),
    path("registros/<int:id>/", RegistroEntrenamientoDetailView.as_view(), name="registro-entrenamiento"),
]