from rest_framework import serializers
from .models import HistorialEntrenamiento, ProgresoEjercicio


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEntrenamiento
        fields = '__all__'


class ProgresoEjercicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgresoEjercicio
        fields = '__all__'