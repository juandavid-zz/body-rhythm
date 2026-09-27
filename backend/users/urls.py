from django.urls import path
from .views import (
    RegistroView, LoginView, UsuarioListView, UsuarioDetailView, PerfilView,
    VerificarEmailView, ReenviarVerificacionView,
)

urlpatterns = [
    path('registro/', RegistroView.as_view()),
    path('login/', LoginView.as_view()),
    path('verificar/<str:token>/', VerificarEmailView.as_view()),
    path('reenviar-verificacion/', ReenviarVerificacionView.as_view()),
    path('perfil/', PerfilView.as_view()),
    path('usuarios/', UsuarioListView.as_view()),
    path('usuarios/<int:id>/', UsuarioDetailView.as_view()),
]