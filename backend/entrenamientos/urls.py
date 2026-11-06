from django.urls import path
from .views import (
    ChatbotRutinaView,
    ChatbotMensajeView,
    GuardarRutinaChatbotView,
    ChatsView,
    ChatDetalleView,
    AnteriorView,
    ProximaCargaView,
    ProgramaView,
    ProgramaIAView,
    ResumenSemanaView,
    HistorialEjercicioView,
    RegistroEntrenamientoListView,
    RegistroEntrenamientoDetailView,
)

urlpatterns = [
    path("chatbot/", ChatbotRutinaView.as_view(), name="chatbot-rutina"),
    path("chatbot/mensaje/", ChatbotMensajeView.as_view(), name="chatbot-mensaje"),
    path("chatbot/guardar/", GuardarRutinaChatbotView.as_view(), name="chatbot-guardar"),
    path("chatbot/chats/", ChatsView.as_view(), name="chatbot-chats"),
    path("chatbot/chats/<str:cliente_id>/", ChatDetalleView.as_view(), name="chatbot-chat"),
    path("registros/", RegistroEntrenamientoListView.as_view(), name="registros-entrenamiento"),
    path("anterior/", AnteriorView.as_view(), name="anterior"),
    path("proxima-carga/", ProximaCargaView.as_view(), name="proxima-carga"),
    path("programa/", ProgramaView.as_view(), name="programa"),
    path("programa/ia/", ProgramaIAView.as_view(), name="programa-ia"),
    path("programa/resumen/", ResumenSemanaView.as_view(), name="programa-resumen"),
    path("ejercicio-historial/", HistorialEjercicioView.as_view(), name="ejercicio-historial"),
    path("registros/<int:id>/", RegistroEntrenamientoDetailView.as_view(), name="registro-entrenamiento"),
]