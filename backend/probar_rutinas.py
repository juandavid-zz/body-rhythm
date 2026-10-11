
import os
import django

os.environ.setdefault(
    'DJANGO_SETTINGS_MODULE',
    'body_rhythm_api.settings'
)
django.setup()

from rutinas.views import EjercicioBiblioteca

nombres = [
    'Jalón al Cuello Detrás de la Cabeza',
    'Almeja con Banda',
    'Sentadilla con Banda',
    'Sentadilla con Talones Elevados',
    'Dragon squat',
    'Bench Press',
    'Remo con Dos Pesas Rusas',
    'Elevación Frontal con Barra',
    'Abdominal Stabilization',
]

for nombre in nombres:
    ejercicios = EjercicioBiblioteca.objects.filter(
        nombre__iexact=nombre
    )

    for e in ejercicios:
        print(f'\n{e.nombre} | grupo: {e.grupo}')
        print('Principales:', e.musculos_principales)
        print('Secundarios:', e.musculos_secundarios)
