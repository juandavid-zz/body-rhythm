from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404

from . import chatbot_service
from .rutina_ia import guardar_rutina, rutina_respaldo
from users.models import Usuario
from .models import RegistroEntrenamiento
from .serializers import RegistroEntrenamientoSerializer

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
            rutina = rutina_respaldo(meta, rango_imc, grupo_muscular)
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


class GuardarRutinaChatbotView(APIView):
    """Guarda la rutina generada en el chat como rutinas del usuario (una por día)."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        rutina = request.data.get("rutina")
        if not isinstance(rutina, dict) or not isinstance(rutina.get("ejercicios"), list):
            return Response(
                {"error": "No llegó una rutina válida para guardar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        usuario = get_object_or_404(Usuario, auth=request.user)
        creadas, omitidos = guardar_rutina(usuario, rutina)

        if not creadas:
            return Response(
                {"error": "Ningún ejercicio de esta rutina está en la biblioteca, así que no se pudo guardar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({"rutinas": creadas, "omitidos": omitidos}, status=status.HTTP_201_CREATED)


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

class RegistroEntrenamientoListView(APIView):
    """Entrenamientos terminados del usuario: listar y guardar uno nuevo."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        registros = usuario.registros_entrenamiento.all()[:100]
        return Response(RegistroEntrenamientoSerializer(registros, many=True).data)

    def post(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        serializer = RegistroEntrenamientoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(usuario=usuario)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RegistroEntrenamientoDetailView(APIView):
    """Cambiar si se comparte (compartido) o borrar un entrenamiento propio."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _registro(self, request, id):
        return get_object_or_404(RegistroEntrenamiento, id=id, usuario__auth=request.user)

    def patch(self, request, id):
        registro = self._registro(request, id)
        serializer = RegistroEntrenamientoSerializer(registro, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, id):
        self._registro(request, id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
