from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import Usuario

from .models import ImcHistorial

MAX_HISTORIAL = 60


def dia_local(fecha):
    """Fecha (sin hora) en la zona del servidor; el proyecto usa USE_TZ = False."""
    return timezone.localtime(fecha).date() if timezone.is_aware(fecha) else fecha.date()


def calcular_imc(peso, altura):
    if not peso or not altura:
        return None
    altura_m = altura / 100 if altura > 3 else altura
    return round(peso / (altura_m ** 2), 1)


def registrar_peso(usuario):
    """Guarda en el historial el peso y la altura actuales del usuario (si los tiene)."""
    imc = calcular_imc(usuario.peso, usuario.altura)
    if imc is None:
        return None
    return ImcHistorial.objects.create(usuario=usuario, peso=usuario.peso, altura=usuario.altura, imc=imc)


def _racha(dias_con_entreno, hoy):
    """Días seguidos con entrenamiento contando desde hoy (o desde ayer si hoy aún no)."""
    racha = 0
    cursor = hoy if hoy in dias_con_entreno else hoy - timedelta(days=1)
    while cursor in dias_con_entreno:
        racha += 1
        cursor -= timedelta(days=1)
    return racha


def _mejor_racha(dias_con_entreno):
    mejor = actual = 0
    anterior = None
    for dia in sorted(dias_con_entreno):
        actual = actual + 1 if anterior and dia - anterior == timedelta(days=1) else 1
        mejor = max(mejor, actual)
        anterior = dia
    return mejor


# Logros: (id, ícono, título, descripción, función que dice si se logró)
LOGROS = [
    ('primer', '💪', 'Primer entrenamiento', 'Terminaste tu primera sesión', lambda t: t['entrenamientos'] >= 1),
    ('diez', '🏋️', '10 entrenamientos', 'Completaste 10 sesiones', lambda t: t['entrenamientos'] >= 10),
    ('cincuenta', '🥇', '50 entrenamientos', 'Completaste 50 sesiones', lambda t: t['entrenamientos'] >= 50),
    ('racha3', '🔥', 'Racha de 3 días', 'Entrenaste 3 días seguidos', lambda t: t['mejor_racha'] >= 3),
    ('racha7', '⚡', 'Racha de 7 días', 'Entrenaste una semana seguida', lambda t: t['mejor_racha'] >= 7),
    ('record', '🏆', 'Primer récord', 'Superaste tu mejor marca en un ejercicio', lambda t: t['records'] >= 1),
    ('volumen', '🚀', '10.000 kg levantados', 'Sumaste 10 toneladas de volumen', lambda t: t['volumen'] >= 10000),
    ('peso', '⚖️', 'Seguimiento de peso', 'Registraste tu peso 3 veces', lambda t: t['registros_peso'] >= 3),
]

# Logros que tienen que ver con el peso corporal: no se muestran en el perfil público
LOGROS_PRIVADOS = {'peso'}


def totales_entrenamiento(registros, hoy=None):
    """Totales de una lista de entrenamientos (necesitan fecha, duración, series, volumen y récords)."""
    hoy = hoy or dia_local(timezone.now())
    dias = {dia_local(r.fecha) for r in registros}
    return {
        'entrenamientos': len(registros),
        'minutos': round(sum(r.duracion_segundos for r in registros) / 60),
        'series': sum(r.series_completadas for r in registros),
        'volumen': round(sum(r.volumen_kg for r in registros), 1),
        'records': sum(len(r.records or []) for r in registros),
        'racha': _racha(dias, hoy),
        'mejor_racha': _mejor_racha(dias),
    }


def insignias_publicas(totales):
    """Logros obtenidos que se pueden mostrar en el perfil (sin los de peso corporal)."""
    return [
        {'id': id_, 'titulo': titulo, 'descripcion': desc}
        for id_, _icono, titulo, desc, cumple in LOGROS
        if id_ not in LOGROS_PRIVADOS and cumple({**totales, 'registros_peso': 0})
    ]


class ProgresoView(APIView):
    """Todo lo que muestra la página de Progreso, calculado con datos reales."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        hoy = dia_local(timezone.now())

        # Peso e IMC
        historial = list(usuario.imc_historial.order_by('-fecha')[:MAX_HISTORIAL])[::-1]
        if not historial and usuario.peso and usuario.altura:
            # Primera visita: el peso del perfil es el punto de partida
            historial = [registrar_peso(usuario)]

        # Entrenamientos
        registros = list(usuario.registros_entrenamiento.only(
            'fecha', 'duracion_segundos', 'series_completadas', 'volumen_kg', 'records', 'nombre',
        ))
        dias = {dia_local(r.fecha) for r in registros}
        inicio_semana = hoy - timedelta(days=6)
        semana = [
            {'fecha': inicio_semana + timedelta(days=i), 'entrenado': (inicio_semana + timedelta(days=i)) in dias}
            for i in range(7)
        ]
        records_recientes = [
            {**record, 'fecha': r.fecha, 'entrenamiento': r.nombre}
            for r in sorted(registros, key=lambda r: r.fecha, reverse=True)
            for record in (r.records or [])
        ][:5]

        totales = {
            **totales_entrenamiento(registros, hoy),
            'dias_semana': sum(1 for d in semana if d['entrenado']),
            'registros_peso': usuario.imc_historial.count(),
        }

        return Response({
            'perfil': {
                'peso': usuario.peso,
                'altura': usuario.altura,
                'imc': calcular_imc(usuario.peso, usuario.altura),
                'meta': usuario.get_meta_display() if usuario.meta else None,
            },
            'historial_peso': [
                {'fecha': h.fecha, 'peso': h.peso, 'imc': h.imc} for h in historial
            ],
            'semana': semana,
            'totales': totales,
            'records_recientes': records_recientes,
            'logros': [
                {'id': id_, 'icono': icono, 'titulo': titulo, 'descripcion': desc, 'obtenido': cumple(totales)}
                for id_, icono, titulo, desc, cumple in LOGROS
            ],
        })


class RegistrarPesoSerializer(serializers.Serializer):
    peso = serializers.FloatField(min_value=20, max_value=400)


class RegistrarPesoView(APIView):
    """Registra el peso de hoy: actualiza el perfil y lo agrega al historial."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        serializer = RegistrarPesoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if not usuario.altura:
            return Response(
                {'error': 'Agrega tu altura en Configuración para calcular tu IMC.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.peso = serializer.validated_data['peso']
        usuario.save(update_fields=['peso'])
        registro = registrar_peso(usuario)
        return Response(
            {'fecha': registro.fecha, 'peso': registro.peso, 'imc': registro.imc},
            status=status.HTTP_201_CREATED
        )
