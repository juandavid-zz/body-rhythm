import re

from rest_framework import serializers
from .models import AuthUsuario, Usuario, Ejercicio, USERNAME_REGEX


def normalizar_username(value):
    return (value or "").strip().lstrip("@").lower()


def validar_username(value, excluir_id=None):
    """Valida formato y que el @username no esté en uso. Devuelve el valor normalizado."""
    username = normalizar_username(value)

    if not re.match(USERNAME_REGEX, username):
        raise serializers.ValidationError(
            "Usa de 3 a 30 caracteres: letras minúsculas, números, punto o guion bajo."
        )

    existentes = Usuario.objects.filter(username__iexact=username)
    if excluir_id:
        existentes = existentes.exclude(id=excluir_id)
    if existentes.exists():
        raise serializers.ValidationError("Ese nombre de usuario ya está en uso.")

    return username


class RegistroSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=31)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    peso = serializers.FloatField(required=False, allow_null=True)
    altura = serializers.FloatField(required=False, allow_null=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    genero = serializers.ChoiceField(
        choices=['masculino', 'femenino', 'otro'],
        required=False,
        allow_null=True,
        allow_blank=True
    )
    meta = serializers.ChoiceField(
        choices=[
            'perder_peso',
            'ganar_musculo',
            'mantenerse',
            'mejorar_resistencia'
        ],
        required=False,
        allow_null=True,
        allow_blank=True
    )

    def validate_username(self, value):
        return validar_username(value)

    def validate_email(self, value):
        if AuthUsuario.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                'El correo ya está registrado'
            )
        return value

    def validate(self, data):
        for campo in [
            'peso',
            'altura',
            'fecha_nacimiento',
            'genero',
            'meta'
        ]:
            if data.get(campo) == '':
                data.pop(campo)

        return data


class LoginSerializer(serializers.Serializer):
    # Acepta el correo o el @username
    email = serializers.CharField()
    password = serializers.CharField()


class EjercicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ejercicio
        fields = [
            'id',
            'repdb_id',
            'nombre',
            'grupo',
            'musculos_principales',
            'musculos_secundarios',
            'descripcion',
            'imagen_inicio',
            'imagen_final',
            'creado_en',
            'actualizado_en',
        ]