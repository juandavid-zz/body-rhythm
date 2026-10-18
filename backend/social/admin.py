from django.contrib import admin

from .models import Comentario, Fuerza, Seguimiento


@admin.register(Seguimiento)
class SeguimientoAdmin(admin.ModelAdmin):
    list_display = ['seguidor', 'seguido', 'estado', 'created_at', 'aceptado_at']
    list_filter = ['estado']
    search_fields = ['seguidor__username', 'seguido__username']


@admin.register(Fuerza)
class FuerzaAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'registro', 'created_at']


@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'registro', 'texto', 'created_at']
    search_fields = ['usuario__username', 'texto']
