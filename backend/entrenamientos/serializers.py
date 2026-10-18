from rest_framework import serializers
from .models import HistorialEntrenamiento, ProgresoEjercicio, RegistroEntrenamiento


class HistorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEntrenamiento
        fields = '__all__'


class ProgresoEjercicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgresoEjercicio
        fields = '__all__'

MAX_EJERCICIOS = 50
MAX_SERIES = 50


def _numero(valor, minimo=0, maximo=100000):
    """Convierte a número positivo acotado; lo que no es número cuenta como None."""
    try:
        numero = float(str(valor).replace(',', '.'))
    except (TypeError, ValueError):
        return None
    if numero != numero or numero < minimo:  # NaN o negativo
        return None
    return min(numero, maximo)


class RegistroEntrenamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroEntrenamiento
        fields = [
            'id',
            'nombre',
            'fecha',
            'duracion_segundos',
            'series_completadas',
            'series_totales',
            'volumen_kg',
            'ejercicios',
            'compartido',
        ]
        read_only_fields = ['id', 'series_completadas', 'series_totales', 'volumen_kg']

    def validate_ejercicios(self, value):
        """
        Normaliza el resumen que manda el frontend (camelCase) y recalcula
        en el servidor las series y el volumen, para no confiar en el cliente.
        """
        if not isinstance(value, list):
            raise serializers.ValidationError('Debe ser una lista de ejercicios.')
        if len(value) > MAX_EJERCICIOS:
            raise serializers.ValidationError(f'Máximo {MAX_EJERCICIOS} ejercicios.')

        ejercicios = []
        for ej in value:
            if not isinstance(ej, dict):
                raise serializers.ValidationError('Cada ejercicio debe ser un objeto.')

            series_entrada = ej.get('series', ej.get('sets', [])) or []
            if not isinstance(series_entrada, list) or len(series_entrada) > MAX_SERIES:
                raise serializers.ValidationError(f'Máximo {MAX_SERIES} series por ejercicio.')

            por_tiempo = bool(ej.get('por_tiempo', ej.get('porTiempo', False)))
            series = []
            for serie in series_entrada:
                if not isinstance(serie, dict):
                    continue
                reps = _numero(serie.get('reps'), maximo=1000)
                series.append({
                    'tipo': str(serie.get('tipo') or 'normal')[:20],
                    'reps': None if por_tiempo or reps is None else int(reps),
                    'peso': None if por_tiempo else _numero(serie.get('peso'), maximo=2000),
                    'peso_kg': None if por_tiempo else _numero(serie.get('peso_kg', serie.get('pesoKg')), maximo=2000),
                    'duracion_segundos': int(_numero(serie.get('duracion_segundos', serie.get('duracionSegundos')), maximo=86400) or 0) if por_tiempo else None,
                    'hecho': bool(serie.get('hecho')),
                })

            ejercicios.append({
                'nombre': str(ej.get('nombre') or 'Ejercicio')[:150],
                'por_tiempo': por_tiempo,
                'unidad_peso': None if por_tiempo else str(ej.get('unidad_peso', ej.get('unidadPeso')) or 'kg')[:5],
                'series': series,
            })

        return ejercicios

    def _totales(self, ejercicios):
        todas = [serie for ej in ejercicios for serie in ej['series']]
        hechas = [serie for serie in todas if serie['hecho']]
        volumen = sum((serie['peso_kg'] or 0) * (serie['reps'] or 0) for serie in hechas)
        return {
            'series_totales': len(todas),
            'series_completadas': len(hechas),
            'volumen_kg': round(volumen, 1),
        }

    def create(self, validated_data):
        validated_data.update(self._totales(validated_data.get('ejercicios', [])))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'ejercicios' in validated_data:
            validated_data.update(self._totales(validated_data['ejercicios']))
        return super().update(instance, validated_data)
