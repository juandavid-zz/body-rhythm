from django.contrib import admin
from .models import (
    CategoriaAlimento,
    Alimento,
    PlanNutricional,
    Comida,
    RegistroComida,
)


@admin.register(CategoriaAlimento)
class CategoriaAlimentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)


@admin.register(Alimento)
class AlimentoAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'nombre', 'categoria', 'calorias_100g',
        'proteinas_100g', 'carbohidratos_100g', 'grasas_100g', 'activo'
    )
    list_filter = ('categoria', 'activo')
    search_fields = ('nombre', 'descripcion')


@admin.register(PlanNutricional)
class PlanNutricionalAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'nombre', 'usuario', 'calorias_diarias',
        'proteinas_g', 'carbohidratos_g', 'grasas_g', 'generada_por_ia', 'created_at'
    )
    list_filter = ('generada_por_ia',)
    search_fields = ('nombre', 'descripcion', 'usuario__nombre')
    readonly_fields = ('created_at',)


@admin.register(Comida)
class ComidaAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'nombre', 'tipo', 'alimento', 'plan',
        'calorias', 'proteinas_g', 'carbohidratos_g', 'grasas_g', 'orden'
    )
    list_filter = ('tipo',)
    search_fields = ('nombre', 'descripcion', 'alimento__nombre')


@admin.register(RegistroComida)
class RegistroComidaAdmin(admin.ModelAdmin):
    list_display = ('id', 'usuario', 'comida', 'fecha')
    list_filter = ('fecha',)
    search_fields = ('usuario__nombre', 'comida__nombre')
    readonly_fields = ('fecha',)
