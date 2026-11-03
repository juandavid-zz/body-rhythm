from django.contrib import admin

from .models import ChatIa, ConversacionIa


@admin.register(ConversacionIa)
class ConversacionIaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'tipo', 'created_at')
    list_filter = ('tipo',)
    list_select_related = ('usuario',)
    search_fields = ('usuario__username', 'mensaje_usuario')


@admin.register(ChatIa)
class ChatIaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'titulo', 'actualizado')
    list_select_related = ('usuario',)
    search_fields = ('usuario__username', 'titulo')
