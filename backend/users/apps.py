from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'users'
    # Nombre que se muestra en el menu lateral y en el dashboard del admin.
    verbose_name = 'Usuarios'

    def ready(self):
        # Traduce también las apps internas de Django que salían en inglés/
        # con el nombre largo por defecto ("Authentication and Authorization").
        from django.apps import apps as django_apps

        etiquetas = {
            'auth': 'Seguridad y accesos',
            'contenttypes': 'Tipos de contenido',
            'sessions': 'Sesiones',
            'admin': 'Administración del sitio',
        }
        for etiqueta, nombre in etiquetas.items():
            try:
                django_apps.get_app_config(etiqueta).verbose_name = nombre
            except LookupError:
                pass
