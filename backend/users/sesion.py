"""Renovar la sesión (token de acceso) a partir del refresh."""
from django.contrib.auth import get_user_model
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenRefreshView


class RenovarSesionSerializer(TokenRefreshSerializer):
    """
    simplejwt busca al usuario con .get(): si la cuenta se borró, lanza
    DoesNotExist y el servidor responde 500. Aquí responde 401, y el
    frontend cierra la sesión como con cualquier token vencido.
    """

    def validate(self, attrs):
        try:
            return super().validate(attrs)
        except get_user_model().DoesNotExist:
            raise AuthenticationFailed('Tu cuenta ya no existe. Inicia sesión de nuevo.', 'cuenta_no_existe')


class RenovarSesionView(TokenRefreshView):
    serializer_class = RenovarSesionSerializer
