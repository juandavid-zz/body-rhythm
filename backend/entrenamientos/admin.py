from django.contrib import admin
from .models import Ejercicio, Rutina, HistorialEntrenamiento

@admin.register(Rutina)
class RutinaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'objetivo', 'rango_imc', 'nivel', 'dias_por_semana']
    list_filter = ['objetivo', 'rango_imc', 'nivel']

@admin.register(Ejercicio)
class EjercicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'rutina', 'grupo_muscular', 'dia', 'series', 'repeticiones']
    list_filter = ['grupo_muscular', 'dia']

@admin.register(HistorialEntrenamiento)
class HistorialAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'rutina', 'fecha', 'completado']