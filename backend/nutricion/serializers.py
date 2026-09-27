from rest_framework import serializers

from .models import (
    CategoriaAlimento,
    Alimento,
    PlanNutricional,
    Comida,
    RegistroComida,
)


class AlimentoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(
        source='categoria.nombre',
        read_only=True,
    )

    class Meta:
        model = Alimento
        fields = [
            'id',
            'categoria',
            'categoria_nombre',
            'nombre',
            'descripcion',
            'calorias_100g',
            'proteinas_100g',
            'carbohidratos_100g',
            'grasas_100g',
            'activo',
        ]
        read_only_fields = [
            'id',
            'categoria_nombre',
        ]


class CategoriaAlimentoSerializer(serializers.ModelSerializer):
    alimentos = AlimentoSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = CategoriaAlimento
        fields = [
            'id',
            'nombre',
            'alimentos',
        ]
        read_only_fields = [
            'id',
            'alimentos',
        ]


class ComidaSerializer(serializers.ModelSerializer):
    alimento_detalle = AlimentoSerializer(
        source='alimento',
        read_only=True,
    )

    nombre = serializers.CharField(
        required=False,
        allow_blank=True,
    )

    class Meta:
        model = Comida
        fields = [
            'id',
            'plan',
            'alimento',
            'alimento_detalle',
            'tipo',
            'nombre',
            'descripcion',
            'calorias',
            'proteinas_g',
            'carbohidratos_g',
            'grasas_g',
            'orden',
        ]
        read_only_fields = [
            'id',
            'plan',
            'alimento_detalle',
        ]

    def _completar_desde_alimento(self, validated_data):
        alimento = validated_data.get('alimento')

        if not alimento:
            return validated_data

        if not validated_data.get('nombre'):
            validated_data['nombre'] = alimento.nombre

        if not validated_data.get('descripcion'):
            validated_data['descripcion'] = alimento.descripcion

        if 'calorias' not in validated_data:
            validated_data['calorias'] = alimento.calorias_100g

        if 'proteinas_g' not in validated_data:
            validated_data['proteinas_g'] = alimento.proteinas_100g

        if 'carbohidratos_g' not in validated_data:
            validated_data['carbohidratos_g'] = alimento.carbohidratos_100g

        if 'grasas_g' not in validated_data:
            validated_data['grasas_g'] = alimento.grasas_100g

        return validated_data

    def create(self, validated_data):
        validated_data = self._completar_desde_alimento(
            validated_data
        )
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._completar_desde_alimento(
            validated_data
        )
        return super().update(instance, validated_data)


class PlanNutricionalSerializer(serializers.ModelSerializer):
    comidas = ComidaSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = PlanNutricional
        fields = [
            'id',
            'usuario',
            'nombre',
            'descripcion',
            'calorias_diarias',
            'proteinas_g',
            'carbohidratos_g',
            'grasas_g',
            'generada_por_ia',
            'created_at',
            'comidas',
        ]
        read_only_fields = [
            'id',
            'usuario',
            'created_at',
            'comidas',
        ]


class RegistroComidaSerializer(serializers.ModelSerializer):
    comida_nombre = serializers.CharField(
        source='comida.nombre',
        read_only=True,
    )
    tipo = serializers.CharField(
        source='comida.tipo',
        read_only=True,
    )
    calorias = serializers.FloatField(
        source='comida.calorias',
        read_only=True,
    )

    fecha = serializers.DateField(
        read_only=True,
    )

    class Meta:
        model = RegistroComida
        fields = [
            'id',
            'comida',
            'comida_nombre',
            'tipo',
            'calorias',
            'fecha',
        ]
        read_only_fields = [
            'id',
            'fecha',
        ]