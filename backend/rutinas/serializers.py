
from rest_framework import serializers
from users.models import Ejercicio as EjercicioBiblioteca
from .models import Rutina, RutinaEjercicio


class EjercicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EjercicioBiblioteca
        fields = "__all__"


class RutinaEjercicioSerializer(serializers.ModelSerializer):
    ejercicio = EjercicioSerializer(read_only=True)

    ejercicio_id = serializers.PrimaryKeyRelatedField(
        queryset=EjercicioBiblioteca.objects.all(),
        source="ejercicio",
        write_only=True,
    )

    class Meta:
        model = RutinaEjercicio
        fields = [
            "id",
            "ejercicio",
            "ejercicio_id",
            "series",
            "repeticiones",
            "descanso_segundos",
            "configuracion_series",
            "unidad_peso",
            "notas",
            "orden",
        ]


class RutinaSerializer(serializers.ModelSerializer):
    ejercicios_detalle = RutinaEjercicioSerializer(
        source="rutinaejercicio_set",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Rutina
        fields = [
            "id",
            "nombre",
            "descripcion",
            "es_favorita",
            "created_at",
            "ejercicios_detalle",
        ]
        read_only_fields = ["created_at"]
