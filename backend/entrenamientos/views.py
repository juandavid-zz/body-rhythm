from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import Throttled
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404

from . import chatbot_service
from .records import _clave, calcular_records, mejor_marca
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


class LimiteIAMixin:
    """Limita cuántas llamadas a la IA hace cada usuario por hora: cada una cuesta en Gemini."""
    throttle_classes = [ScopedRateThrottle]

    def throttled(self, request, wait):
        minutos = max(1, round((wait or 60) / 60))
        raise Throttled(wait, detail=f"Usaste mucho el asistente por ahora. Intenta de nuevo en {minutos} min.")


class ChatbotRutinaView(LimiteIAMixin, APIView):
    throttle_scope = "ia_rutina"
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


class ChatbotMensajeView(LimiteIAMixin, APIView):
    """
    NUEVO endpoint: chat libre. El usuario escribe cualquier pregunta y
    la IA responde en Markdown, con el contexto de su perfil.
    """
    throttle_scope = "ia_chat"
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
        serializer = RegistroEntrenamientoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        # Si el entrenamiento no dice si se comparte, se usa la preferencia de la cuenta
        extra = {} if 'compartido' in request.data else {'compartido': usuario.compartir_por_defecto}
        registro = serializer.save(usuario=usuario, **extra)

        registro.records = calcular_records(registro)
        registro.save(update_fields=['records'])

        return Response(RegistroEntrenamientoSerializer(registro).data, status=status.HTTP_201_CREATED)


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


def _series_hechas(ejercicio):
    return [s for s in ejercicio.get('series') or [] if s.get('hecho')]


class AnteriorView(APIView):
    """
    "Anterior" de Hevy/Strong: lo que hiciste la última vez en cada ejercicio,
    sin importar en qué rutina. GET ?nombres=Sentadilla|Press de banca
    """

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        pedidos = {_clave(n): n for n in request.query_params.get('nombres', '').split('|') if n.strip()}
        if not pedidos:
            return Response({})

        encontrados = {}
        registros = usuario.registros_entrenamiento.order_by('-fecha', '-id').only('fecha', 'ejercicios')
        for registro in registros.iterator():
            for ejercicio in registro.ejercicios or []:
                clave = _clave(ejercicio.get('nombre'))
                hechas = _series_hechas(ejercicio)
                if clave in pedidos and clave not in encontrados and hechas:
                    encontrados[clave] = {
                        'fecha': registro.fecha,
                        'unidad_peso': ejercicio.get('unidad_peso') or 'kg',
                        'series': hechas,
                    }
            if len(encontrados) == len(pedidos):
                break

        # Se responde con el nombre tal como lo pidió el frontend
        return Response({pedidos[clave]: datos for clave, datos in encontrados.items()})


class HistorialEjercicioView(APIView):
    """Sesiones en las que hiciste un ejercicio, con la mejor serie de cada una. GET ?nombre=..."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        clave = _clave(request.query_params.get('nombre', ''))
        if not clave:
            return Response({'sesiones': [], 'mejor': None, 'veces': 0})

        sesiones = []
        mejor = None
        for registro in usuario.registros_entrenamiento.order_by('-fecha', '-id').only('fecha', 'nombre', 'ejercicios'):
            for ejercicio in registro.ejercicios or []:
                if _clave(ejercicio.get('nombre')) != clave:
                    continue
                hechas = _series_hechas(ejercicio)
                marca = mejor_marca(ejercicio)
                if not hechas or marca is None:
                    continue
                sesiones.append({
                    'fecha': registro.fecha,
                    'entrenamiento': registro.nombre,
                    'unidad_peso': ejercicio.get('unidad_peso') or 'kg',
                    'por_tiempo': bool(ejercicio.get('por_tiempo')),
                    'series': hechas,
                    'mejor': {'tipo': marca[0], 'valor': marca[1]},
                })
                if mejor is None or (marca[0] == mejor['tipo'] and marca[1] > mejor['valor']):
                    mejor = {'tipo': marca[0], 'valor': marca[1], 'fecha': registro.fecha}

        return Response({'sesiones': sesiones[:30], 'mejor': mejor, 'veces': len(sesiones)})
