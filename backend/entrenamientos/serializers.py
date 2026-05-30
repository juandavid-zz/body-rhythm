from rest_framework import serializers
from .models import Ejercicio, Rutina, HistorialEntrenamiento


class EjercicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ejercicio
        fields = [
            'id', 'nombre', 'descripcion', 'series', 'repeticiones',
            'duracion_segundos', 'descanso_segundos', 'orden',
            'grupo_muscular', 'nivel', 'dia'
        ]


class RutinaSerializer(serializers.ModelSerializer):
    ejercicios = EjercicioSerializer(many=True, read_only=True)

    class Meta:
        model = Rutina
        fields = [
            'id', 'nombre', 'descripcion', 'nivel', 'objetivo',
            'rango_imc', 'dias_por_semana', 'duracion_minutos', 'ejercicios'
        ]


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEntrenamiento
        fields = '__all__'