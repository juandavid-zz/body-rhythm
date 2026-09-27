from rest_framework import serializers
from .models import PlanNutricional, Comida, RegistroComida


class ComidaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comida
        fields = [
            'id', 'plan', 'tipo', 'nombre', 'descripcion',
            'calorias', 'proteinas_g', 'carbohidratos_g', 'grasas_g', 'orden'
        ]
        read_only_fields = ['id', 'plan']


class PlanNutricionalSerializer(serializers.ModelSerializer):
    comidas = ComidaSerializer(many=True, read_only=True)

    class Meta:
        model = PlanNutricional
        fields = [
            'id', 'usuario', 'nombre', 'descripcion',
            'calorias_diarias', 'proteinas_g', 'carbohidratos_g',
            'grasas_g', 'generada_por_ia', 'created_at', 'comidas'
        ]
        read_only_fields = ['id', 'usuario', 'created_at', 'comidas']


class RegistroComidaSerializer(serializers.ModelSerializer):
    comida_nombre = serializers.CharField(source='comida.nombre', read_only=True)
    fecha = serializers.DateField(read_only=True)

    class Meta:
        model = RegistroComida
        fields = ['id', 'comida', 'comida_nombre', 'fecha']
        read_only_fields = ['id', 'fecha']
