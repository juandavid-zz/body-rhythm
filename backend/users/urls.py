from django.urls import path
from .views import RegistroView, LoginView, UsuarioListView, UsuarioDetailView

urlpatterns = [
    path('registro/', RegistroView.as_view()),
    path('login/', LoginView.as_view()),
    path('usuarios/', UsuarioListView.as_view()),
    path('usuarios/<int:id>/', UsuarioDetailView.as_view()),
]