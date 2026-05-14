from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from .models import AuthUsuario, Usuario
from .serializers import RegistroSerializer, LoginSerializer

# CREATE - Registro
class RegistroView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data

            # Verificar que el email no exista
            if AuthUsuario.objects.filter(email=data['email']).exists():
                return Response({'error': 'El correo ya está registrado'}, status=status.HTTP_400_BAD_REQUEST)

            # Crear usuario con el password de Django (no bcrypt)
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
                'mensaje': 'Usuario registrado correctamente'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
                return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

            # Verificar password con el método de Django
            if not auth.check_password(data['password']):
                auth.intentos_fallidos += 1
                auth.save()
                return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

            auth.intentos_fallidos = 0
            auth.ultimo_login = timezone.now()
            auth.save()
            refresh = RefreshToken.for_user(auth)
            return Response({
                'token': str(refresh.access_token),
                'mensaje': 'Login exitoso'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# READ - Obtener todos los usuarios
class UsuarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuarios = Usuario.objects.all().values(
            'id', 'nombre', 'peso', 'altura',
            'fecha_nacimiento', 'genero', 'meta', 'created_at'
        )
        return Response(list(usuarios))

# READ/UPDATE/DELETE - Un usuario por ID
class UsuarioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            usuario = Usuario.objects.get(id=id)
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
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, id):
        try:
            usuario = Usuario.objects.get(id=id)
            usuario.nombre = request.data.get('nombre', usuario.nombre)
            usuario.peso = request.data.get('peso', usuario.peso)
            usuario.altura = request.data.get('altura', usuario.altura)
            usuario.fecha_nacimiento = request.data.get('fecha_nacimiento', usuario.fecha_nacimiento)
            usuario.genero = request.data.get('genero', usuario.genero)
            usuario.meta = request.data.get('meta', usuario.meta)
            usuario.save()
            return Response({'mensaje': 'Usuario actualizado correctamente'})
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, id):
        try:
            usuario = Usuario.objects.get(id=id)
            usuario.auth.delete()
            return Response({'mensaje': 'Usuario eliminado correctamente'})
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)