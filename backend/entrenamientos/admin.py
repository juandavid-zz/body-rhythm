from django.contrib import admin

from .models import HistorialEntrenamiento, ProgresoEjercicio


@admin.register(HistorialEntrenamiento)
class HistorialAdmin(admin.ModelAdmin):
    list_display = [
        'usuario',
        'rutina',
        'fecha',
        'completado'
    ]

    list_filter = [
        'completado',
        'fecha'
    ]


@admin.register(ProgresoEjercicio)
class ProgresoEjercicioAdmin(admin.ModelAdmin):
    list_display = [
        'historial',
        'ejercicio',
        'series_realizadas',
        'repeticiones_realizadas',
        'peso_usado'
    ]
