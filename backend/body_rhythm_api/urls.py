"""
URL configuration for body_rhythm_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include, re_path
from django.views.static import serve
from users.sesion import RenovarSesionView

def salud(request):
    """Render la visita para saber si el servidor está arriba (sin tocar la base)."""
    return JsonResponse({'ok': True})


urlpatterns = [
    path('api/salud/', salud),
    path('admin/', admin.site.urls),
    path('api/', include('users.urls')),
    path('api/', include('rutinas.urls')),
    path('api/', include('nutricion.urls')),
    path('api/entrenamientos/', include('entrenamientos.urls')),
    path('api/social/', include('social.urls')),
    path('api/progreso/', include('progreso.urls')),
    path('api/token/refresh/', RenovarSesionView.as_view(), name='token_refresh'),
]

# Fotos subidas: en desarrollo siempre; en producción solo con SERVIR_MEDIA=True
# (si no, las sirve el servidor web, por ejemplo Nginx con un alias a MEDIA_ROOT)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif settings.SERVIR_MEDIA:
    urlpatterns += [re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT})]
