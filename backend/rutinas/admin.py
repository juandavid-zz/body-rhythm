from django.contrib import admin
from .models import Ejercicio, Rutina, RutinaEjercicio


class RutinaEjercicioInline(admin.TabularInline):
    model = RutinaEjercicio
    extra = 1


@admin.register(Ejercicio)
class EjercicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'grupo_muscular', 'created_at']
    list_filter = ['grupo_muscular']
    search_fields = ['nombre']


@admin.register(Rutina)
class RutinaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'usuario', 'nivel', 'es_favorita', 'created_at']
    list_filter = ['nivel', 'es_favorita']
    search_fields = ['nombre', 'usuario__nombre']
    inlines = [RutinaEjercicioInline]