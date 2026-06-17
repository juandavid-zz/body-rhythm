from django.contrib import admin
from .models import AuthUsuario, Usuario


@admin.register(AuthUsuario)
class AuthUsuarioAdmin(admin.ModelAdmin):
    list_display = ['email', 'verificado', 'created_at']
    list_filter = ['verificado']
    search_fields = ['email']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'ultimo_login']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Estado', {'fields': ('verificado', 'intentos_fallidos', 'bloqueado_hasta')}),
        ('Fechas', {'fields': ('created_at', 'ultimo_login')}),
    )


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'auth', 'genero', 'meta', 'peso', 'altura', 'created_at']
    list_filter = ['genero', 'meta']
    search_fields = ['nombre', 'auth__email']