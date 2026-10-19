from django.db import IntegrityError
from django.db.models import Case, Count, Exists, IntegerField, OuterRef, Q, Value, When
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from entrenamientos.models import RegistroEntrenamiento
from users.models import Usuario

from .models import Comentario, Fuerza, Seguimiento
from .permisos import ids_visibles_en_feed, puede_interactuar, puede_ver_contenido
from .serializers import (
    ComentarioSerializer,
    PublicacionFeedSerializer,
    SolicitudSerializer,
    cargar_relaciones,
    relacion_con,
    serializar_usuarios,
)

TAMANO_PAGINA = 20
MAX_RESULTADOS_BUSQUEDA = 20
MAX_SUGERENCIAS = 5


def usuario_actual(request):
    return get_object_or_404(Usuario, auth=request.user)


def usuario_por_username(username):
    return get_object_or_404(
        Usuario,
        username__iexact=username.lstrip('@'),
        auth__is_active=True,
    )


def paginar(request, queryset, serializer_class):
    try:
        pagina = max(int(request.query_params.get('pagina', 1)), 1)
    except ValueError:
        pagina = 1

    inicio = (pagina - 1) * TAMANO_PAGINA
    filas = list(queryset[inicio:inicio + TAMANO_PAGINA + 1])
    hay_mas = len(filas) > TAMANO_PAGINA

    return Response({
        'resultados': serializer_class(filas[:TAMANO_PAGINA], many=True).data,
        'siguiente_pagina': pagina + 1 if hay_mas else None,
    })


def anotar_interacciones(registros, yo):
    """Agrega a cada entrenamiento sus fuerzas, comentarios y si yo ya le di fuerza."""
    return registros.select_related('usuario').annotate(
        num_fuerzas=Count('fuerzas', distinct=True),
        num_comentarios=Count('comentarios', distinct=True),
        di_fuerza=Exists(Fuerza.objects.filter(registro=OuterRef('pk'), usuario=yo)),
    )


def registro_con_acceso(request, id):
    """El entrenamiento si quien consulta puede verlo e interactuar; si no, 404."""
    yo = usuario_actual(request)
    registro = get_object_or_404(RegistroEntrenamiento.objects.select_related('usuario'), id=id)
    if not puede_interactuar(yo, registro):
        # 404 en vez de 403 para no revelar que existe
        return yo, None
    return yo, registro


def respuesta_privada():
    return Response(
        {'error': 'Esta cuenta es privada. Síguela para ver su contenido.', 'privado': True},
        status=status.HTTP_403_FORBIDDEN,
    )


class BuscarUsuariosView(APIView):
    """Busca por @username o nombre. Los que empiezan por el texto salen primero."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        yo = usuario_actual(request)
        texto = request.query_params.get('q', '').strip().lstrip('@')

        if not texto:
            return Response([])

        usuarios = (
            Usuario.objects
            .filter(Q(username__icontains=texto) | Q(nombre__icontains=texto))
            .filter(auth__is_active=True, auth__verificado=True)
            .exclude(id=yo.id)
            .annotate(prioridad=Case(
                When(username__istartswith=texto, then=Value(0)),
                When(nombre__istartswith=texto, then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ))
            .order_by('prioridad', 'username')[:MAX_RESULTADOS_BUSQUEDA]
        )

        return Response(serializar_usuarios(yo, usuarios))


class PerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        yo = usuario_actual(request)
        perfil = usuario_por_username(username)
        enviados, recibidos = cargar_relaciones(yo, [perfil])
        visible = puede_ver_contenido(yo, perfil)

        entrenamientos = perfil.registros_entrenamiento.all()
        if perfil.id != yo.id:
            entrenamientos = entrenamientos.filter(compartido=True)

        return Response({
            'id': perfil.id,
            'username': perfil.username,
            'nombre': perfil.nombre,
            'meta': perfil.get_meta_display() if perfil.meta else None,
            'miembro_desde': perfil.created_at,
            'seguidores': perfil.seguimientos_recibidos.filter(estado=Seguimiento.ACEPTADO).count(),
            'seguidos': perfil.seguimientos_enviados.filter(estado=Seguimiento.ACEPTADO).count(),
            'entrenamientos': entrenamientos.count(),
            'cuenta_privada': perfil.cuenta_privada,
            'puede_ver': visible,
            **relacion_con(yo, perfil, enviados, recibidos),
        })


class EntrenamientosPerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        yo = usuario_actual(request)
        perfil = usuario_por_username(username)

        if not puede_ver_contenido(yo, perfil):
            return respuesta_privada()

        registros = perfil.registros_entrenamiento.all()
        if perfil.id != yo.id:
            registros = registros.filter(compartido=True)

        return paginar(request, anotar_interacciones(registros, yo).order_by('-fecha', '-id'), PublicacionFeedSerializer)


class ListaRelacionesView(APIView):
    """Seguidores o seguidos aceptados de un perfil."""

    permission_classes = [IsAuthenticated]
    tipo = None  # 'seguidores' o 'seguidos'

    def get(self, request, username):
        yo = usuario_actual(request)
        perfil = usuario_por_username(username)

        if not puede_ver_contenido(yo, perfil):
            return respuesta_privada()

        if self.tipo == 'seguidores':
            usuarios = Usuario.objects.filter(
                seguimientos_enviados__seguido=perfil,
                seguimientos_enviados__estado=Seguimiento.ACEPTADO,
            )
        else:
            usuarios = Usuario.objects.filter(
                seguimientos_recibidos__seguidor=perfil,
                seguimientos_recibidos__estado=Seguimiento.ACEPTADO,
            )

        return Response(serializar_usuarios(yo, usuarios.order_by('username')))


class SeguirView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        """Sigue al instante si la cuenta es pública; si es privada, envía una solicitud."""
        yo = usuario_actual(request)
        perfil = usuario_por_username(username)

        if perfil.id == yo.id:
            return Response({'error': 'No puedes seguirte a ti mismo.'}, status=status.HTTP_400_BAD_REQUEST)

        publica = not perfil.cuenta_privada
        try:
            seguimiento, creado = Seguimiento.objects.get_or_create(
                seguidor=yo,
                seguido=perfil,
                defaults={
                    'estado': Seguimiento.ACEPTADO if publica else Seguimiento.PENDIENTE,
                    'aceptado_at': timezone.now() if publica else None,
                },
            )
        except IntegrityError:
            seguimiento, creado = Seguimiento.objects.get(seguidor=yo, seguido=perfil), False

        return Response(
            {'estado': seguimiento.estado},
            status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK,
        )

    def delete(self, request, username):
        """Deja de seguir o cancela la solicitud enviada."""
        yo = usuario_actual(request)
        perfil = usuario_por_username(username)
        Seguimiento.objects.filter(seguidor=yo, seguido=perfil).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class EliminarSeguidorView(APIView):
    """Quita a alguien de mis seguidores: deja de ver mis entrenamientos."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, username):
        yo = usuario_actual(request)
        seguidor = usuario_por_username(username)
        Seguimiento.objects.filter(seguidor=seguidor, seguido=yo).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SolicitudesView(APIView):
    """Solicitudes pendientes que otros me enviaron."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        yo = usuario_actual(request)
        solicitudes = (
            Seguimiento.objects
            .filter(seguido=yo, estado=Seguimiento.PENDIENTE)
            .select_related('seguidor')
            .order_by('-created_at')
        )
        return Response(SolicitudSerializer(solicitudes, many=True).data)


class SolicitudDetalleView(APIView):
    permission_classes = [IsAuthenticated]

    def _solicitud(self, request, id):
        return get_object_or_404(
            Seguimiento,
            id=id,
            seguido=usuario_actual(request),
            estado=Seguimiento.PENDIENTE,
        )

    def post(self, request, id):
        """Acepta la solicitud."""
        solicitud = self._solicitud(request, id)
        solicitud.estado = Seguimiento.ACEPTADO
        solicitud.aceptado_at = timezone.now()
        solicitud.save(update_fields=['estado', 'aceptado_at'])
        return Response({'estado': solicitud.estado})

    def delete(self, request, id):
        """Rechaza la solicitud."""
        self._solicitud(request, id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FeedView(APIView):
    """Entrenamientos compartidos por mí y por las cuentas que sigo (aceptadas)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        yo = usuario_actual(request)
        registros = (
            RegistroEntrenamiento.objects
            .filter(usuario_id__in=ids_visibles_en_feed(yo))
            .filter(Q(compartido=True) | Q(usuario=yo))
        )
        return paginar(request, anotar_interacciones(registros, yo).order_by('-fecha', '-id'), PublicacionFeedSerializer)


class FuerzaView(APIView):
    """Dar fuerza (POST) o quitarla (DELETE) a un entrenamiento."""

    permission_classes = [IsAuthenticated]

    def _respuesta(self, yo, registro):
        return Response({
            'fuerzas': registro.fuerzas.count(),
            'di_fuerza': registro.fuerzas.filter(usuario=yo).exists(),
        })

    def post(self, request, id):
        yo, registro = registro_con_acceso(request, id)
        if registro is None:
            return Response({'error': 'Entrenamiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            Fuerza.objects.get_or_create(usuario=yo, registro=registro)
        except IntegrityError:
            pass  # doble clic: ya existía
        return self._respuesta(yo, registro)

    def delete(self, request, id):
        yo, registro = registro_con_acceso(request, id)
        if registro is None:
            return Response({'error': 'Entrenamiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        Fuerza.objects.filter(usuario=yo, registro=registro).delete()
        return self._respuesta(yo, registro)


class ComentariosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        yo, registro = registro_con_acceso(request, id)
        if registro is None:
            return Response({'error': 'Entrenamiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        comentarios = registro.comentarios.select_related('usuario')
        return Response(ComentarioSerializer(comentarios, many=True).data)

    def post(self, request, id):
        yo, registro = registro_con_acceso(request, id)
        if registro is None:
            return Response({'error': 'Entrenamiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = ComentarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(usuario=yo, registro=registro)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ComentarioDetalleView(APIView):
    """Borra un comentario: su autor o el dueño del entrenamiento."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        yo = usuario_actual(request)
        comentario = get_object_or_404(
            Comentario.objects.filter(Q(usuario=yo) | Q(registro__usuario=yo)),
            id=id,
        )
        comentario.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SugerenciasView(APIView):
    """
    A quién seguir: primero gente a la que siguen las cuentas que sigo,
    después las cuentas más nuevas. Nunca yo ni a quien ya sigo o pedí seguir.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        yo = usuario_actual(request)
        ya_relacionados = Seguimiento.objects.filter(seguidor=yo).values_list('seguido_id', flat=True)
        mis_seguidos = Seguimiento.objects.filter(
            seguidor=yo, estado=Seguimiento.ACEPTADO,
        ).values_list('seguido_id', flat=True)

        candidatos = (
            Usuario.objects
            .filter(auth__is_active=True, auth__verificado=True)
            .exclude(id=yo.id)
            .exclude(id__in=ya_relacionados)
            .annotate(en_comun=Count(
                'seguimientos_recibidos',
                filter=Q(
                    seguimientos_recibidos__seguidor_id__in=mis_seguidos,
                    seguimientos_recibidos__estado=Seguimiento.ACEPTADO,
                ),
            ))
            .order_by('-en_comun', '-created_at')[:MAX_SUGERENCIAS]
        )
        return Response(serializar_usuarios(yo, candidatos))
