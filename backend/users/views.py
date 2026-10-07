from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.conf import settings
import requests

from .models import AuthUsuario, Usuario, Pago, Ejercicio
from .serializers import (
    RegistroSerializer,
    LoginSerializer,
    EjercicioSerializer
)
from .emails import enviar_correo_verificacion, token_vigente


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

            enviado = enviar_correo_verificacion(auth, nombre=data['nombre'])

            return Response({
                'mensaje': 'Cuenta creada. Te enviamos un correo para confirmarla.',
                'email': auth.email,
                'correo_enviado': enviado,
                'requiere_verificacion': True,
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

            if not auth.verificado:
                return Response({
                    'error': 'Debes confirmar tu correo antes de iniciar sesión.',
                    'requiere_verificacion': True,
                    'email': auth.email,
                }, status=status.HTTP_403_FORBIDDEN)

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


# READ - Obtener todos los usuarios (solo administradores)
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


# READ - Obtener un usuario por ID
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

    def put(self, request, id):
        try:
            usuario = Usuario.objects.get(id=id)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if usuario.auth_id != request.user.id:
            return Response(
                {'error': 'No tienes permiso sobre este recurso'},
                status=status.HTTP_403_FORBIDDEN
            )

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
        try:
            usuario = Usuario.objects.get(id=id)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if usuario.auth_id != request.user.id:
            return Response(
                {'error': 'No tienes permiso sobre este recurso'},
                status=status.HTTP_403_FORBIDDEN
            )

        usuario.auth.delete()

        return Response({
            'mensaje': 'Usuario eliminado correctamente'
        })


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


# CREAR PAGO CON WOMPI
class WompiPagoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = Usuario.objects.get(auth=request.user)

        plan = request.data.get('plan')

        precios = {
            'pro': 19900,
            'premium': 29900,
        }

        if plan not in precios:
            return Response(
                {'error': 'Plan inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        precio = precios[plan]

        referencia = (
            f"BR-{usuario.id}-"
            f"{timezone.now().strftime('%Y%m%d%H%M%S%f')}"
        )

        import hashlib

        cadena = (
            f"{referencia}"
            f"{precio * 100}"
            f"COP"
            f"{settings.WOMPI_INTEGRITY_SECRET}"
        )

        firma = hashlib.sha256(
            cadena.encode('utf-8')
        ).hexdigest()

        pago = Pago.objects.create(
            usuario=usuario,
            plan=plan,
            precio=precio,
            referencia=referencia,
            metodo='tarjeta',
            estado='pendiente'
        )

        return Response({
            'public_key': settings.WOMPI_PUBLIC_KEY,
            'currency': 'COP',
            'amount_in_cents': precio * 100,
            'reference': referencia,
            'signature': firma,
            'pago_id': pago.id
        }, status=status.HTTP_201_CREATED)


# CREAR PAGO
class PagoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = Usuario.objects.get(auth=request.user)

        plan = request.data.get('plan')
        metodo = request.data.get('metodo')
        referencia = request.data.get('referencia')

        precios = {
            'pro': 19900,
            'premium': 29900,
        }

        if plan not in precios:
            return Response(
                {'error': 'Plan inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if metodo not in ['tarjeta', 'pse']:
            return Response(
                {'error': 'Método de pago inválido'},
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

        precio = precios[plan]

        pago = Pago.objects.create(
            usuario=usuario,
            plan=plan,
            precio=precio,
            referencia=referencia,
            metodo=metodo,
            estado='pendiente'
        )

        return Response({
            'mensaje': 'Pago creado correctamente',
            'pago': {
                'id': pago.id,
                'plan': pago.plan,
                'precio': str(pago.precio),
                'referencia': pago.referencia,
                'estado': pago.estado,
                'metodo': pago.metodo,
                'fecha': pago.fecha
            }
        }, status=status.HTTP_201_CREATED)


# WEBHOOK DE WOMPI
class WompiWebhookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        import hashlib
        import hmac

        data = request.data

        print("=== WEBHOOK WOMPI RECIBIDO ===")
        print(data)

        if data.get('event') != 'transaction.updated':
            return Response(
                {'mensaje': 'Evento ignorado'},
                status=status.HTTP_200_OK
            )

        transaction = data.get(
            'data',
            {}
        ).get(
            'transaction',
            {}
        )

        signature = data.get('signature', {})

        properties = signature.get('properties', [])
        checksum = signature.get('checksum')
        timestamp = data.get('timestamp')

        if not properties or not checksum or timestamp is None:
            return Response(
                {'error': 'Firma del evento incompleta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valores = []

        for prop in properties:
            partes = prop.split('.')
            valor = transaction

            for parte in partes[1:]:
                valor = valor.get(parte)

            if valor is None:
                return Response(
                    {'error': f'Propiedad inválida: {prop}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valores.append(str(valor))

        cadena = (
            ''.join(valores)
            + str(timestamp)
            + settings.WOMPI_EVENTS_SECRET
        )

        checksum_calculado = hashlib.sha256(
            cadena.encode('utf-8')
        ).hexdigest()

        if not hmac.compare_digest(
            checksum_calculado.lower(),
            checksum.lower()
        ):
            print("ERROR: checksum de Wompi inválido")

            return Response(
                {'error': 'Checksum inválido'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        referencia = transaction.get('reference')
        estado_wompi = transaction.get('status')
        monto = transaction.get('amount_in_cents')
        moneda = transaction.get('currency')

        print("Referencia:", referencia)
        print("Estado Wompi:", estado_wompi)
        print("Monto:", monto)
        print("Moneda:", moneda)

        if not referencia:
            return Response(
                {'error': 'La transacción no tiene referencia'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pago = Pago.objects.get(
                referencia=referencia
            )
        except Pago.DoesNotExist:
            print("Pago no encontrado:", referencia)

            return Response(
                {'error': 'Pago no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        monto_esperado = int(pago.precio * 100)

        if monto != monto_esperado or moneda != 'COP':
            print("ERROR: monto o moneda no coinciden")

            return Response(
                {'error': 'Monto o moneda inválidos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if estado_wompi == 'APPROVED':

            if pago.estado == 'aprobado':
                print("Pago ya procesado:", pago.id)

                return Response(
                    {'mensaje': 'Pago ya procesado'},
                    status=status.HTTP_200_OK
                )

            pago.estado = 'aprobado'
            pago.save(update_fields=['estado'])

            print("Pago aprobado:", pago.id)

        elif estado_wompi in [
            'DECLINED',
            'VOIDED',
            'ERROR'
        ]:
            pago.estado = 'rechazado'
            pago.save(update_fields=['estado'])

            print("Pago rechazado:", pago.id)

        return Response(
            {'mensaje': 'Evento procesado correctamente'},
            status=status.HTTP_200_OK
        )


# VERIFICAR CUENTA POR CORREO
class VerificarEmailView(APIView):
    permission_classes = [AllowAny]

    def _verificar(self, request, token):
        try:
            auth = AuthUsuario.objects.get(token=token)
        except AuthUsuario.DoesNotExist:
            return Response(
                {'error': 'El enlace de verificación no es válido.', 'expirado': False},
                status=status.HTTP_400_BAD_REQUEST
            )

        if auth.verificado:
            return Response({'mensaje': 'Esta cuenta ya estaba verificada.'})

        if not token_vigente(auth):
            return Response(
                {
                    'error': 'El enlace venció. Pide que te reenvíen el correo.',
                    'expirado': True,
                    'email': auth.email,
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        auth.verificado = True
        auth.token = None
        auth.token_expira = None
        auth.codigo_verificacion = None
        auth.save(update_fields=['verificado', 'token', 'token_expira', 'codigo_verificacion'])

        refresh = RefreshToken.for_user(auth)

        return Response({
            'mensaje': 'Cuenta verificada correctamente. Ya puedes iniciar sesión.',
            'token': str(refresh.access_token),
            'refresh': str(refresh),
        })

    def get(self, request, token):
        return self._verificar(request, token)

    def post(self, request, token):
        return self._verificar(request, token)


# REENVIAR CORREO DE VERIFICACIÓN
class ReenviarVerificacionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response(
                {'error': 'El correo es obligatorio.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            auth = AuthUsuario.objects.get(email=email)
        except AuthUsuario.DoesNotExist:
            return Response(
                {'error': 'No encontramos una cuenta con ese correo.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if auth.verificado:
            return Response({'mensaje': 'Esta cuenta ya está verificada.'})

        try:
            usuario = Usuario.objects.get(auth=auth)
            nombre = usuario.nombre
        except Usuario.DoesNotExist:
            nombre = ''

        enviado = enviar_correo_verificacion(auth, nombre=nombre)

        return Response({
            'mensaje': 'Te reenviamos el correo de confirmación.',
            'correo_enviado': enviado,
        })
