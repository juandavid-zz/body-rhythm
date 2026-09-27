from django.contrib import admin
from .models import PlanNutricional, Comida, RegistroComida


@admin.register(PlanNutricional)
class PlanNutricionalAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'usuario', 'calorias_diarias', 'proteinas_g', 'carbohidratos_g', 'grasas_g', 'generada_por_ia', 'created_at']
    list_filter = ['generada_por_ia']
    search_fields = ['nombre', 'usuario__nombre', 'usuario__auth__email']
    ordering = ['-created_at']


@admin.register(Comida)
class ComidaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo', 'plan', 'calorias', 'proteinas_g', 'carbohidratos_g', 'grasas_g', 'orden']
    list_filter = ['tipo']
    search_fields = ['nombre', 'plan__nombre']
    ordering = ['plan', 'orden', 'id']


@admin.register(RegistroComida)
class RegistroComidaAdmin(admin.ModelAdmin):
    list_display = ['usuario', 'comida', 'fecha']
    list_filter = ['fecha']
    search_fields = ['usuario__nombre', 'usuario__auth__email', 'comida__nombre']
    readonly_fields = ['fecha']
