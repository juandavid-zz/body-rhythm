from rest_framework import serializers
from .models import AuthUsuario, Usuario

class RegistroSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    peso = serializers.FloatField(required=False, allow_null=True)
    altura = serializers.FloatField(required=False, allow_null=True)
    fecha_nacimiento = serializers.DateField(required=False, allow_null=True)
    genero = serializers.ChoiceField(choices=['masculino', 'femenino', 'otro'], required=False, allow_null=True, allow_blank=True)
    meta = serializers.ChoiceField(choices=['perder_peso', 'ganar_musculo', 'mantenerse', 'mejorar_resistencia'], required=False, allow_null=True, allow_blank=True)

    def validate_email(self, value):
        if AuthUsuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('El correo ya está registrado')
        return value

    def validate(self, data):
        # Limpiar campos vacíos que llegan como "" desde el formulario
        for campo in ['peso', 'altura', 'fecha_nacimiento', 'genero', 'meta']:
            if data.get(campo) == '':
                data.pop(campo)
        return data

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()