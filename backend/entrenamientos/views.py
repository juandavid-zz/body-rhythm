from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from users.models import Usuario
from .models import Ejercicio, Rutina
from .serializers import EjercicioSerializer, RutinaSerializer


def calcular_imc(peso, altura):
    """
    Calcula el IMC dado peso en kg y altura en cm.
    Retorna el valor del IMC redondeado a 2 decimales.
    """
    if not peso or not altura or altura == 0:
        return None
    altura_m = altura / 100  # convertir cm a metros
    return round(peso / (altura_m ** 2), 2)


def clasificar_imc(imc):
    """
    Clasifica el IMC en uno de los 4 rangos definidos en el modelo Rutina.
    """
    if imc is None:
        return None
    if imc < 18.5:
        return 'bajo_peso'
    elif imc < 25:
        return 'normal'
    elif imc < 30:
        return 'sobrepeso'
    else:
        return 'obesidad'


class MiRutinaView(APIView):
    """
    GET /api/entrenamientos/mi-rutina/
    Devuelve la rutina asignada al usuario autenticado
    basándose en su IMC calculado y su meta registrada.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            usuario = Usuario.objects.get(auth=request.user)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Perfil de usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validar que el usuario tenga los datos necesarios
        if not usuario.peso or not usuario.altura:
            return Response(
                {'error': 'El usuario no tiene peso o altura registrados'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not usuario.meta:
            return Response(
                {'error': 'El usuario no tiene una meta registrada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calcular IMC y clasificarlo
        imc = calcular_imc(usuario.peso, usuario.altura)
        rango = clasificar_imc(imc)

        # Buscar rutina que coincida con meta + rango IMC
        rutina = Rutina.objects.filter(
            objetivo=usuario.meta,
            rango_imc=rango
        ).first()

        if not rutina:
            return Response(
                {
                    'error': 'No se encontró una rutina para tu perfil',
                    'imc': imc,
                    'rango_imc': rango,
                    'meta': usuario.meta
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RutinaSerializer(rutina)
        return Response({
            'imc': imc,
            'rango_imc': rango,
            'categoria_imc': {
            'bajo_peso': 'Bajo Peso (IMC < 18.5)',
            'normal': 'Normal (IMC 18.5 - 24.9)',
            'sobrepeso': 'Sobrepeso (IMC 25 - 29.9)',
            'obesidad': 'Obesidad (IMC >= 30)',
            }.get(rango),
            'meta': usuario.meta,
            'rutina': serializer.data
        })


class EjerciciosView(APIView):
    """
    GET /api/entrenamientos/ejercicios/
    Devuelve el catálogo completo de ejercicios.
    Soporta filtrado por ?grupo_muscular=pecho&nivel=principiante
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ejercicios = Ejercicio.objects.all()

        grupo = request.query_params.get('grupo_muscular')
        nivel = request.query_params.get('nivel')

        if grupo:
            ejercicios = ejercicios.filter(grupo_muscular=grupo)
        if nivel:
            ejercicios = ejercicios.filter(nivel=nivel)

        serializer = EjercicioSerializer(ejercicios, many=True)
        return Response(serializer.data)
