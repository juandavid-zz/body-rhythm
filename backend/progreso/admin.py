from django.contrib import admin

from .models import ImcHistorial, MedidaCorporal


@admin.register(MedidaCorporal)
class MedidaCorporalAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha', 'cintura', 'pecho', 'grasa_corporal')
    list_select_related = ('usuario',)
    search_fields = ('usuario__username',)


@admin.register(ImcHistorial)
class ImcHistorialAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fecha', 'peso', 'imc')
    list_select_related = ('usuario',)
    search_fields = ('usuario__username',)
