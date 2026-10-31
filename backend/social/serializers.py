from rest_framework import serializers

from users.fotos import url_foto

from entrenamientos.serializers import RegistroEntrenamientoSerializer
from users.models import Usuario

from .models import Comentario, Seguimiento


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
        data['foto'] = url_foto(instance)
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
        return resumen_usuario(obj.seguidor)


def resumen_usuario(usuario):
    return {'id': usuario.id, 'username': usuario.username, 'nombre': usuario.nombre, 'foto': url_foto(usuario)}


class PublicacionFeedSerializer(RegistroEntrenamientoSerializer):
    """
    Entrenamiento tal como aparece en el feed y el perfil: quién lo hizo y
    sus interacciones. Los conteos vienen anotados en la consulta
    (ver anotar_interacciones) para no hacer una consulta por publicación.
    """

    usuario = serializers.SerializerMethodField()
    fuerzas = serializers.IntegerField(source='num_fuerzas', read_only=True, default=0)
    comentarios = serializers.IntegerField(source='num_comentarios', read_only=True, default=0)
    di_fuerza = serializers.BooleanField(read_only=True, default=False)

    class Meta(RegistroEntrenamientoSerializer.Meta):
        fields = RegistroEntrenamientoSerializer.Meta.fields + ['usuario', 'fuerzas', 'comentarios', 'di_fuerza']

    def get_usuario(self, obj):
        return resumen_usuario(obj.usuario)


class ComentarioSerializer(serializers.ModelSerializer):
    usuario = serializers.SerializerMethodField()

    class Meta:
        model = Comentario
        fields = ['id', 'usuario', 'texto', 'created_at']
        read_only_fields = ['id', 'usuario', 'created_at']

    def get_usuario(self, obj):
        return resumen_usuario(obj.usuario)

    def validate_texto(self, value):
        texto = value.strip()
        if not texto:
            raise serializers.ValidationError('El comentario no puede estar vacío.')
        return texto
