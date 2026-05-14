from rest_framework import serializers
from .models import AuthUsuario, Usuario
import bcrypt

class RegistroSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    peso = serializers.FloatField(required=False)
    altura = serializers.FloatField(required=False)
    fecha_nacimiento = serializers.DateField(required=False)
    genero = serializers.ChoiceField(choices=['masculino', 'femenino', 'otro'], required=False)
    meta = serializers.ChoiceField(choices=['perder_peso', 'ganar_musculo', 'mantenerse', 'mejorar_resistencia'], required=False)

    def validate_email(self, value):
        if AuthUsuario.objects.filter(email=value).exists():
            raise serializers.ValidationError('El correo ya está registrado')
        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()