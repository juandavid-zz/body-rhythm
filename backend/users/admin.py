from django.contrib import admin
from django.db.models import Count
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

from .models import AuthUsuario, Usuario


class UsuarioInline(admin.StackedInline):
    """Permite ver/editar el perfil sin salir de la cuenta de acceso."""
    model = Usuario
    can_delete = False
    extra = 0
    verbose_name = 'Perfil'
    verbose_name_plural = 'Perfil del usuario'


@admin.register(AuthUsuario)
class AuthUsuarioAdmin(admin.ModelAdmin):
    list_display = ['email', 'estado_cuenta', 'estado_bloqueo', 'intentos_fallidos', 'created_at']
    list_filter = ['verificado', 'is_active', 'is_staff', 'created_at']
    search_fields = ['email']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    readonly_fields = ['created_at', 'ultimo_login']
    inlines = [UsuarioInline]
    actions = ['marcar_verificados', 'desbloquear_cuentas', 'reenviar_verificacion']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Estado', {'fields': ('verificado', 'is_active', 'is_staff', 'intentos_fallidos', 'bloqueado_hasta')}),
        ('Fechas', {'fields': ('created_at', 'ultimo_login')}),
    )

    @admin.display(description='Cuenta', ordering='verificado')
    def estado_cuenta(self, obj):
        if obj.verificado:
            return format_html('<span class="br-tag ok">Verificada</span>')
        return format_html('<span class="br-tag warn">Sin verificar</span>')

    @admin.display(description='Acceso')
    def estado_bloqueo(self, obj):
        if obj.bloqueado_hasta and obj.bloqueado_hasta > timezone.now():
            return format_html('<span class="br-tag danger">Bloqueada</span>')
        if not obj.is_active:
            return format_html('<span class="br-tag danger">Inactiva</span>')
        return format_html('<span class="br-tag ok">Activa</span>')

    @admin.action(description='Marcar como verificadas')
    def marcar_verificados(self, request, queryset):
        total = queryset.update(verificado=True)
        self.message_user(request, f'{total} cuenta(s) marcadas como verificadas.')

    @admin.action(description='Reenviar correo de confirmación')
    def reenviar_verificacion(self, request, queryset):
        from .emails import enviar_correo_verificacion

        enviados = 0
        for auth in queryset.filter(verificado=False):
            nombre = getattr(getattr(auth, 'usuario', None), 'nombre', '')
            if enviar_correo_verificacion(auth, nombre=nombre):
                enviados += 1
        self.message_user(request, f'{enviados} correo(s) de confirmación enviados.')

    @admin.action(description='Desbloquear y reiniciar intentos fallidos')
    def desbloquear_cuentas(self, request, queryset):
        total = queryset.update(bloqueado_hasta=None, intentos_fallidos=0)
        self.message_user(request, f'{total} cuenta(s) desbloqueadas.')


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'auth', 'genero', 'meta', 'peso', 'altura', 'total_rutinas', 'created_at']
    list_filter = ['genero', 'meta', 'created_at']
    search_fields = ['nombre', 'auth__email']
    ordering = ['-created_at']
    date_hierarchy = 'created_at'
    list_per_page = 25
    list_select_related = ['auth']
    autocomplete_fields = ['auth']
    readonly_fields = ['created_at']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_rutinas=Count('rutinas'))

    @admin.display(description='Rutinas', ordering='_rutinas')
    def total_rutinas(self, obj):
        return obj._rutinas


# Identidad visual del panel administrativo de Body Rhythm.
admin.site.site_header = 'Body Rhythm Admin'
admin.site.site_title = 'Body Rhythm Admin'
admin.site.index_title = 'Panel de control'
admin.site.empty_value_display = '—'


# --- Indicadores del dashboard -------------------------------------------
_each_context_original = admin.site.each_context


def _each_context_con_kpis(request):
    contexto = _each_context_original(request)
    # Solo se calculan en la portada del admin, no en cada pantalla.
    if request.path.rstrip('/') != reverse('admin:index').rstrip('/'):
        return contexto
    try:
        from rutinas.models import Ejercicio, Rutina

        ahora = timezone.now()
        sin_verificar = AuthUsuario.objects.filter(verificado=False).count()
        contexto['br_kpis'] = [
            {
                'label': 'Cuentas registradas',
                'valor': AuthUsuario.objects.count(),
                'detalle': f'{AuthUsuario.objects.filter(created_at__month=ahora.month, created_at__year=ahora.year).count()} este mes',
                'url': reverse('admin:users_authusuario_changelist'),
                'alerta': False,
            },
            {
                'label': 'Sin verificar',
                'valor': sin_verificar,
                'detalle': 'Requieren revisión' if sin_verificar else 'Todo al día',
                'url': reverse('admin:users_authusuario_changelist') + '?verificado__exact=0',
                'alerta': sin_verificar > 0,
            },
            {
                'label': 'Rutinas creadas',
                'valor': Rutina.objects.count(),
                'detalle': f'{Rutina.objects.filter(es_favorita=True).count()} marcadas como favoritas',
                'url': reverse('admin:rutinas_rutina_changelist'),
                'alerta': False,
            },
            {
                'label': 'Ejercicios en catálogo',
                'valor': Ejercicio.objects.count(),
                'detalle': f'{Ejercicio.objects.values("grupo_muscular").distinct().count()} grupos musculares',
                'url': reverse('admin:rutinas_ejercicio_changelist'),
                'alerta': False,
            },
        ]
    except Exception:
        # Si la base de datos no responde, el panel sigue cargando igual.
        contexto.pop('br_kpis', None)
    return contexto


admin.site.each_context = _each_context_con_kpis
