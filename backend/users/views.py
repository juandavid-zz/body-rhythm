from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import AuthUsuario, Usuario, Pago, Ejercicio
from .serializers import (
    RegistroSerializer,
    LoginSerializer,
    EjercicioSerializer
)


# CREATE - Registro
class RegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)

        if serializer.is_valid():
            data = serializer.validated_data

            if AuthUsuario.objects.filter(email=data['email']).exists():
                return Response(
                    {'error': 'El correo ya está registrado'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            auth = AuthUsuario.objects.create_user(
                email=data['email'],
                password=data['password']
            )

            Usuario.objects.create(
                auth=auth,
                nombre=data['nombre'],
                peso=data.get('peso'),
                altura=data.get('altura'),
                fecha_nacimiento=data.get('fecha_nacimiento'),
                genero=data.get('genero'),
                meta=data.get('meta')
            )

            refresh = RefreshToken.for_user(auth)

            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'mensaje': 'Usuario registrado correctamente',
                'nombre': data['nombre']
            }, status=status.HTTP_201_CREATED)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# LOGIN
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            data = serializer.validated_data

            try:
                auth = AuthUsuario.objects.get(email=data['email'])
            except AuthUsuario.DoesNotExist:
                return Response(
                    {'error': 'Credenciales incorrectas'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not auth.check_password(data['password']):
                auth.intentos_fallidos += 1
                auth.save()

                return Response(
                    {'error': 'Credenciales incorrectas'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            auth.intentos_fallidos = 0
            auth.ultimo_login = timezone.now()
            auth.save()

            refresh = RefreshToken.for_user(auth)
            usuario = Usuario.objects.get(auth=auth)

            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'mensaje': 'Login exitoso',
                'nombre': usuario.nombre
            })

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# READ - Obtener todos los usuarios
class UsuarioListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        usuarios = Usuario.objects.all().values(
            'id',
            'nombre',
            'peso',
            'altura',
            'fecha_nacimiento',
            'genero',
            'meta',
            'created_at'
        )

        return Response(list(usuarios))


# READ/UPDATE/DELETE - Un usuario por ID
class UsuarioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object_or_403(self, request, id):
        try:
            usuario = Usuario.objects.get(id=id)
        except Usuario.DoesNotExist:
            return None, Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if usuario.auth_id != request.user.id:
            return None, Response(
                {'error': 'No tienes permiso sobre este recurso'},
                status=status.HTTP_403_FORBIDDEN
            )

        return usuario, None

    def get(self, request, id):
        usuario, error = self.get_object_or_403(request, id)

        if error:
            return error

        return Response({
            'id': usuario.id,
            'nombre': usuario.nombre,
            'peso': usuario.peso,
            'altura': usuario.altura,
            'fecha_nacimiento': usuario.fecha_nacimiento,
            'genero': usuario.genero,
            'meta': usuario.meta,
            'created_at': usuario.created_at
        })

    def put(self, request, id):
        usuario, error = self.get_object_or_403(request, id)

        if error:
            return error

        usuario.nombre = request.data.get(
            'nombre',
            usuario.nombre
        )
        usuario.peso = request.data.get(
            'peso',
            usuario.peso
        )
        usuario.altura = request.data.get(
            'altura',
            usuario.altura
        )
        usuario.fecha_nacimiento = request.data.get(
            'fecha_nacimiento',
            usuario.fecha_nacimiento
        )
        usuario.genero = request.data.get(
            'genero',
            usuario.genero
        )
        usuario.meta = request.data.get(
            'meta',
            usuario.meta
        )

        usuario.save()

        return Response({
            'mensaje': 'Usuario actualizado correctamente'
        })

    def delete(self, request, id):
        usuario, error = self.get_object_or_403(request, id)

        if error:
            return error

        usuario.auth.delete()

        return Response({
            'mensaje': 'Usuario eliminado correctamente'
        })


# OBTENER USUARIO AUTENTICADO
class UsuarioMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            usuario = Usuario.objects.get(auth=request.user)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            'id': usuario.id,
            'nombre': usuario.nombre,
            'peso': usuario.peso,
            'altura': usuario.altura,
            'fecha_nacimiento': usuario.fecha_nacimiento,
            'genero': usuario.genero,
            'meta': usuario.meta,
            'plan': usuario.plan,
            'fecha_inicio_plan': usuario.fecha_inicio_plan,
            'fecha_fin_plan': usuario.fecha_fin_plan,
            'created_at': usuario.created_at
        })


# CREAR PAGO
class PagoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = Usuario.objects.get(auth=request.user)

        plan = request.data.get('plan')
        precio = request.data.get('precio')
        metodo = request.data.get('metodo')
        referencia = request.data.get('referencia')

        if plan not in ['pro', 'premium']:
            return Response(
                {'error': 'Plan inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if metodo not in ['tarjeta', 'pse']:
            return Response(
                {'error': 'Método de pago inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not precio:
            return Response(
                {'error': 'El precio es obligatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not referencia:
            return Response(
                {'error': 'La referencia es obligatoria'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Pago.objects.filter(referencia=referencia).exists():
            return Response(
                {'error': 'La referencia del pago ya existe'},
                status=status.HTTP_400_BAD_REQUEST
            )

        pago = Pago.objects.create(
            usuario=usuario,
            plan=plan,
            precio=precio,
            referencia=referencia,
            metodo=metodo,
            estado='aprobado'
        )

        ahora = timezone.now()

        usuario.plan = plan
        usuario.fecha_inicio_plan = ahora
        usuario.fecha_fin_plan = ahora + timezone.timedelta(days=30)
        usuario.save()

        return Response({
            'mensaje': 'Pago realizado correctamente',
            'pago': {
                'id': pago.id,
                'plan': pago.plan,
                'precio': str(pago.precio),
                'referencia': pago.referencia,
                'estado': pago.estado,
                'metodo': pago.metodo,
                'fecha': pago.fecha
            },
            'plan_usuario': usuario.plan,
            'fecha_inicio': usuario.fecha_inicio_plan,
            'fecha_fin': usuario.fecha_fin_plan
        }, status=status.HTTP_201_CREATED)


# READ - Obtener todos los ejercicios
class EjercicioListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        ejercicios = Ejercicio.objects.filter(
            repdb_id__isnull=False
        )

        serializer = EjercicioSerializer(
            ejercicios,
            many=True
        )

        return Response(serializer.data)