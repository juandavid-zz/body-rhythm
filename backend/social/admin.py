from django.contrib import admin

from .models import Seguimiento


@admin.register(Seguimiento)
class SeguimientoAdmin(admin.ModelAdmin):
    list_display = ['seguidor', 'seguido', 'estado', 'created_at', 'aceptado_at']
    list_filter = ['estado']
    search_fields = ['seguidor__username', 'seguido__username']
