from django.contrib import admin
from django.db.models import Count
from django.utils.html import format_html

from .models import Ejercicio, Rutina, RutinaEjercicio


class RutinaEjercicioInline(admin.TabularInline):
    model = RutinaEjercicio
    extra = 1
    autocomplete_fields = ['ejercicio']
    verbose_name = 'Ejercicio de la rutina'
    verbose_name_plural = 'Ejercicios de la rutina'


@admin.register(Ejercicio)
class EjercicioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'grupo_muscular', 'tiene_media', 'usado_en', 'created_at']
    list_filter = ['grupo_muscular', 'created_at']
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']
    list_per_page = 25
    readonly_fields = ['created_at']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_usos=Count('rutinaejercicio'))

    @admin.display(description='Multimedia')
    def tiene_media(self, obj):
        etiquetas = []
        if obj.imagen_url:
            etiquetas.append('Imagen')
        if obj.video_url:
            etiquetas.append('Vídeo')
        if not etiquetas:
            return format_html('<span class="br-tag warn">Sin material</span>')
        return format_html('<span class="br-tag ok">{}</span>', ' + '.join(etiquetas))

    @admin.display(description='En rutinas', ordering='_usos')
    def usado_en(self, obj):
        return obj._usos


@admin.register(Rutina)
class RutinaAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'usuario', 'total_ejercicios', 'es_favorita', 'created_at']
    list_filter = ['es_favorita', 'created_at']
    search_fields = ['nombre', 'usuario__nombre', 'usuario__auth__email']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = ['usuario']
    autocomplete_fields = ['usuario']
    readonly_fields = ['created_at']
    inlines = [RutinaEjercicioInline]
    actions = ['marcar_favoritas', 'quitar_favoritas']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_ejercicios=Count('rutinaejercicio'))

    @admin.display(description='Ejercicios', ordering='_ejercicios')
    def total_ejercicios(self, obj):
        return obj._ejercicios

    @admin.action(description='Marcar como favoritas')
    def marcar_favoritas(self, request, queryset):
        total = queryset.update(es_favorita=True)
        self.message_user(request, f'{total} rutina(s) marcadas como favoritas.')

    @admin.action(description='Quitar de favoritas')
    def quitar_favoritas(self, request, queryset):
        total = queryset.update(es_favorita=False)
        self.message_user(request, f'{total} rutina(s) ya no son favoritas.')
