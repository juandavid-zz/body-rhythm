from rest_framework import serializers

from entrenamientos.serializers import RegistroEntrenamientoSerializer
from users.models import Usuario

from .models import Seguimiento


def relacion_con(visitante, usuario, enviados, recibidos):
    """
    Estado de la relación del visitante con `usuario`, desde el punto de vista del visitante.
    `enviados` y `recibidos` son diccionarios {id_usuario: Seguimiento} ya cargados,
    para no hacer una consulta por cada fila.
    """
    if visitante.id == usuario.id:
        return {'relacion': 'yo', 'te_sigue': False, 'solicitud_recibida_id': None}

    enviado = enviados.get(usuario.id)
    recibido = recibidos.get(usuario.id)

    if enviado is None:
        relacion = 'ninguna'
    elif enviado.estado == Seguimiento.ACEPTADO:
        relacion = 'siguiendo'
    else:
        relacion = 'pendiente'

    return {
        'relacion': relacion,
        'te_sigue': bool(recibido and recibido.estado == Seguimiento.ACEPTADO),
        'solicitud_recibida_id': recibido.id if recibido and recibido.estado == Seguimiento.PENDIENTE else None,
    }


def cargar_relaciones(visitante, usuarios):
    ids = [u.id for u in usuarios]
    enviados = {
        s.seguido_id: s
        for s in Seguimiento.objects.filter(seguidor=visitante, seguido_id__in=ids)
    }
    recibidos = {
        s.seguidor_id: s
        for s in Seguimiento.objects.filter(seguido=visitante, seguidor_id__in=ids)
    }
    return enviados, recibidos


class UsuarioResumenSerializer(serializers.ModelSerializer):
    """Datos públicos mínimos de un usuario + su relación con quien consulta."""

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'nombre']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        visitante = self.context['visitante']
        enviados, recibidos = self.context['relaciones']
        data.update(relacion_con(visitante, instance, enviados, recibidos))
        return data


def serializar_usuarios(visitante, usuarios):
    usuarios = list(usuarios)
    contexto = {'visitante': visitante, 'relaciones': cargar_relaciones(visitante, usuarios)}
    return UsuarioResumenSerializer(usuarios, many=True, context=contexto).data


class SolicitudSerializer(serializers.ModelSerializer):
    usuario = serializers.SerializerMethodField()

    class Meta:
        model = Seguimiento
        fields = ['id', 'usuario', 'created_at']

    def get_usuario(self, obj):
        return {'id': obj.seguidor.id, 'username': obj.seguidor.username, 'nombre': obj.seguidor.nombre}


class PublicacionFeedSerializer(RegistroEntrenamientoSerializer):
    """Entrenamiento tal como aparece en el feed: incluye quién lo hizo."""

    usuario = serializers.SerializerMethodField()

    class Meta(RegistroEntrenamientoSerializer.Meta):
        fields = RegistroEntrenamientoSerializer.Meta.fields + ['usuario']

    def get_usuario(self, obj):
        return {'id': obj.usuario.id, 'username': obj.usuario.username, 'nombre': obj.usuario.nombre}
