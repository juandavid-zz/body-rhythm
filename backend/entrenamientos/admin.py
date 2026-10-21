from django.contrib import admin

from .models import HistorialEntrenamiento, ProgresoEjercicio, RegistroEntrenamiento


@admin.register(RegistroEntrenamiento)
class RegistroEntrenamientoAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'nombre', 'fecha', 'series_completadas', 'volumen_kg', 'compartido']
    list_filter = ['compartido', 'fecha']
    search_fields = ['usuario__username', 'nombre']


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
