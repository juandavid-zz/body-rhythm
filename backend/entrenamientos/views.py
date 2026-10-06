from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from . import chatbot_service
from rutinas.models import Rutina, Ejercicio

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
    "tren superior": ["pecho", "espalda", "hombros", "biceps", "triceps", "brazos"],
    "superior": ["pecho", "espalda", "hombros", "biceps", "triceps", "brazos"],
    "tren inferior": ["cuadriceps", "gluteos", "isquiotibiales", "pantorrillas", "piernas"],
    "inferior": ["cuadriceps", "gluteos", "isquiotibiales", "pantorrillas", "piernas"],
    "piernas": ["cuadriceps", "gluteos", "isquiotibiales", "pantorrillas", "piernas"],
    "core": ["abdomen", "core"],
    "abdomen": ["abdomen", "core"],
}


def _rutina_respaldo(meta, rango_imc, grupo_muscular=None):
    """
    Busca en el catálogo precargado una rutina
    que coincida con el objetivo y rango de IMC.
    """

    rutina = Rutina.objects.filter(
        objetivo=meta,
        rango_imc=rango_imc,
        usuario__isnull=True
    ).first()

    if not rutina:
        rutina = Rutina.objects.filter(
            rango_imc=rango_imc,
            usuario__isnull=True
        ).first()

    if not rutina:
        return None

    relaciones = list(
        RutinaEjercicio.objects
        .filter(rutina=rutina)
        .select_related('ejercicio')
        .order_by('orden')
    )

    if grupo_muscular:
        clave = grupo_muscular.strip().lower()
        palabras_clave = MAPA_GRUPO_MUSCULAR.get(clave)

        if palabras_clave:
            filtrados = [
                relacion
                for relacion in relaciones
                if any(
                    palabra in (relacion.ejercicio.grupo_muscular or "").lower()
                    for palabra in palabras_clave
                )
            ]

            if filtrados:
                relaciones = filtrados

    return {
        "nombre": rutina.nombre,
        "descripcion": rutina.descripcion,
        "dias_por_semana": rutina.dias_por_semana,
        "duracion_minutos": rutina.duracion_minutos,
        "ejercicios": [
            {
                "id": relacion.ejercicio.id,
                "nombre": relacion.ejercicio.nombre,
                "descripcion": relacion.ejercicio.descripcion,
                "grupo_muscular": relacion.ejercicio.grupo_muscular,
                "series": relacion.series,
                "repeticiones": relacion.repeticiones,
                "descanso_segundos": relacion.descanso_segundos,
                "orden": relacion.orden,
            }
            for relacion in relaciones
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