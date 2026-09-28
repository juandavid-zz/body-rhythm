from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import AuthUsuario, Usuario


@admin.register(AuthUsuario)
class AuthUsuarioAdmin(UserAdmin):
    model = AuthUsuario
    list_display = ['email', 'is_active', 'is_staff', 'verificado', 'created_at']
    list_filter = ['is_active', 'is_staff', 'verificado']
    search_fields = ['email']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Estado', {'fields': ('is_active', 'is_staff', 'is_superuser', 'verificado')}),
        ('Seguridad', {'fields': ('intentos_fallidos', 'bloqueado_hasta')}),
        ('Fechas', {'fields': ('created_at', 'ultimo_login')}),
    )
    readonly_fields = ['created_at', 'ultimo_login']
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'auth', 'genero', 'meta', 'peso', 'altura', 'created_at']
    list_filter = ['genero', 'meta']
    search_fields = ['nombre', 'auth__email']