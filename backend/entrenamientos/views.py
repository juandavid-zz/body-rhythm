from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from . import chatbot_service
from rutinas.models import Ejercicio

# Ajusta este import al modelo real de tu app chatbot_ia
from chatbot_ia.models import ConversacionIa


def _guardar_conversacion(usuario, mensaje_usuario, respuesta, fuente):
    """
    Guarda cada intercambio en conversaciones_ia.
    Envuelto en try/except para que un problema de guardado NUNCA tumbe
    la respuesta al usuario (solo se pierde el registro histórico).
    """
    try:
        ConversacionIa.objects.create(
            usuario=usuario,
            mensaje_usuario=mensaje_usuario,
            respuesta=str(respuesta),
            fuente=fuente,
        )
    except Exception as e:
        print(f"[conversaciones_ia] No se pudo guardar el registro: {e}")


MAPA_GRUPO_MUSCULAR = {
    "tren superior": ["pecho", "espalda", "hombros", "biceps", "triceps"],
    "superior": ["pecho", "espalda", "hombros", "biceps", "triceps"],
    "tren inferior": ["cuadriceps", "gluteos", "femoral", "pantorrillas"],
    "inferior": ["cuadriceps", "gluteos", "femoral", "pantorrillas"],
    "piernas": ["cuadriceps", "gluteos", "femoral", "pantorrillas"],
    "core": ["abdomen"],
    "abdomen": ["abdomen"],
}

NOMBRES_META = {
    "perder_peso": "pérdida de peso",
    "ganar_musculo": "ganancia muscular",
    "mantenerse": "mantenimiento",
    "mejorar_resistencia": "mejorar la resistencia",
}


def _rutina_respaldo(meta, rango_imc, grupo_muscular=None, max_ejercicios=6):
    """
    Arma una rutina de respaldo con el catálogo de ejercicios
    cuando la IA no está disponible.
    """

    ejercicios = Ejercicio.objects.all()

    if grupo_muscular:
        clave = grupo_muscular.strip().lower()
        grupos = MAPA_GRUPO_MUSCULAR.get(clave)
        if grupos is None and clave.replace(" ", "_") in dict(Ejercicio.GRUPOS_MUSCULARES):
            grupos = [clave.replace(" ", "_")]

        if grupos:
            filtrados = ejercicios.filter(grupo_muscular__in=grupos)
            if filtrados.exists():
                ejercicios = filtrados

    ejercicios = list(ejercicios.order_by('?')[:max_ejercicios])

    if not ejercicios:
        return None

    objetivo = NOMBRES_META.get(meta, meta or "general")

    return {
        "nombre": f"Rutina de respaldo ({grupo_muscular or 'cuerpo completo'})",
        "descripcion": f"Rutina básica orientada a {objetivo} para IMC {rango_imc}.",
        "dias_por_semana": 3,
        "duracion_minutos": 45,
        "ejercicios": [
            {
                "id": ejercicio.id,
                "nombre": ejercicio.nombre,
                "descripcion": ejercicio.descripcion,
                "grupo_muscular": ejercicio.grupo_muscular,
                "series": 3,
                "repeticiones": 12,
                "descanso_segundos": 60,
                "orden": orden,
            }
            for orden, ejercicio in enumerate(ejercicios, start=1)
        ],
    }


class ChatbotRutinaView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        lugar = request.data.get("lugar")
        equipo = request.data.get("equipo")
        grupo_muscular = request.data.get("grupo_muscular", "cuerpo completo")

        if not lugar or not equipo:
            return Response(
                {"error": "Faltan datos (lugar/equipo)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = request.user
        perfil = getattr(usuario, "usuario", usuario)
        peso = getattr(perfil, "peso", None)
        altura = getattr(perfil, "altura", None)
        meta = getattr(perfil, "meta", "perder_peso")

        if not peso or not altura:
            return Response(
                {"error": "Completa tu peso y altura en tu perfil antes de generar una rutina."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        imc = chatbot_service.calcular_imc(float(peso), float(altura))
        rango_imc = chatbot_service.obtener_rango_imc(imc)

        try:
            rutina = chatbot_service.generar_rutina_ia(usuario, lugar, equipo, grupo_muscular)
            fuente = "ia"
        except Exception as e:
            print(f"[chatbot] Gemini falló, usando respaldo: {e}")
            rutina = _rutina_respaldo(meta, rango_imc, grupo_muscular)
            fuente = "respaldo"

            if rutina is None:
                return Response(
                    {"error": "No se pudo generar la rutina ni encontrar un respaldo para tu perfil."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        resultado = {
            "imc": imc,
            "rango_imc": rango_imc,
            "fuente": fuente,
            "rutina": rutina,
        }

        _guardar_conversacion(
            usuario,
            f"Generar rutina: lugar={lugar}, equipo={equipo}, grupo_muscular={grupo_muscular}",
            resultado,
            fuente,
        )

        return Response(resultado, status=status.HTTP_200_OK)


class ChatbotMensajeView(APIView):
    """
    NUEVO endpoint: chat libre. El usuario escribe cualquier pregunta y
    la IA responde en Markdown, con el contexto de su perfil.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        mensaje = request.data.get("mensaje", "").strip()
        historial = request.data.get("historial", [])
        rutina_actual = request.data.get("rutina_actual")

        if not mensaje:
            return Response(
                {"error": "El mensaje no puede estar vacío."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = request.user

        try:
            respuesta = chatbot_service.responder_pregunta_ia(
                usuario, mensaje, historial, rutina_actual
            )
            fuente = "ia"
        except Exception as e:
            print(f"[chatbot] Error generando respuesta libre: {e}")
            respuesta = (
                "No pude conectarme con el asistente en este momento. "
                "Intenta de nuevo en unos segundos."
            )
            fuente = "error"

        _guardar_conversacion(usuario, mensaje, respuesta, fuente)

        return Response({"respuesta": respuesta, "fuente": fuente}, status=status.HTTP_200_OK)