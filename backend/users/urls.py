from django.urls import path

from .views import (
    RegistroView,
    LoginView,
    UsuarioListView,
    UsuarioDetailView,
    UsuarioMeView,
    PagoView,
    EjercicioListView,
    VerificarEmailView,
    ReenviarVerificacionView,
    WompiPagoView,
    WompiWebhookView,
)

urlpatterns = [
    path('registro/', RegistroView.as_view()),
    path('login/', LoginView.as_view()),
    path('usuarios/', UsuarioListView.as_view()),
    path('usuarios/<int:id>/', UsuarioDetailView.as_view()),
    path('usuarios/me/', UsuarioMeView.as_view()),
    path('pagos/', PagoView.as_view()),
    path('ejercicios/', EjercicioListView.as_view()),
    path('verificar/<str:token>/', VerificarEmailView.as_view()),
    path('reenviar-verificacion/', ReenviarVerificacionView.as_view()),
    path('pagos/wompi/', WompiPagoView.as_view()),
    path('pagos/webhook/', WompiWebhookView.as_view()),
]
