from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import IntegrityError, transaction
from django.db.transaction import atomic
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from django.conf import settings

from progreso.views import registrar_peso
from social.models import Seguimiento

from .fotos import FotoInvalida, borrar_foto, procesar_foto, url_foto
from .models import AuthUsuario, Usuario, Pago, Ejercicio
from rest_framework.exceptions import ValidationError

from .serializers import (
    CambiarPasswordSerializer,
    ConfiguracionSerializer,
    RegistroSerializer,
    LoginSerializer,
    EjercicioSerializer,
    normalizar_username,
    validar_username,
)
import secrets

from .emails import (
    MAX_INTENTOS_CODIGO,
    datos_envio,
    enviar_correo_verificacion,
    segundos_para_reenviar,
    token_vigente,
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

            try:
                with transaction.atomic():
                    auth = AuthUsuario.objects.create_user(
                        email=data['email'],
                        password=data['password']
                    )

                    Usuario.objects.create(
                        auth=auth,
                        nombre=data['nombre'],
                        username=data['username'],
                        peso=data.get('peso'),
                        altura=data.get('altura'),
                        fecha_nacimiento=data.get('fecha_nacimiento'),
                        genero=data.get('genero'),
                        meta=data.get('meta')
                    )
            except IntegrityError:
                # Otro registro tomó el mismo username al mismo tiempo
                return Response(
                    {'username': ['Ese nombre de usuario ya está en uso.']},
                    status=status.HTTP_400_BAD_REQUEST
                )

            enviado = enviar_correo_verificacion(auth, nombre=data['nombre'])

            return Response({
                'mensaje': 'Cuenta creada. Te enviamos un correo para confirmarla.',
                'email': auth.email,
                'requiere_verificacion': True,
                **datos_envio(auth, enviado),
            }, status=status.HTTP_201_CREATED)

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# Bloqueo por fuerza bruta: tras MAX_INTENTOS_LOGIN contraseñas incorrectas seguidas
MAX_INTENTOS_LOGIN = 5
MINUTOS_BLOQUEO_LOGIN = 15


# LOGIN
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        if serializer.is_valid():
            data = serializer.validated_data

            identificador = data['email'].strip()

            try:
                if '@' in identificador.lstrip('@'):
                    auth = AuthUsuario.objects.get(email__iexact=identificador)
                else:
                    auth = Usuario.objects.select_related('auth').get(
                        username__iexact=normalizar_username(identificador)
                    ).auth
            except (AuthUsuario.DoesNotExist, Usuario.DoesNotExist):
                return Response(
                    {'error': 'Credenciales incorrectas'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            ahora = timezone.now()
            if auth.bloqueado_hasta and auth.bloqueado_hasta > ahora:
                minutos = max(1, int((auth.bloqueado_hasta - ahora).total_seconds() // 60) + 1)
                return Response(
                    {'error': f'Demasiados intentos fallidos. Intenta de nuevo en {minutos} minutos.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            if not auth.check_password(data['password']):
                auth.intentos_fallidos += 1
                if auth.intentos_fallidos >= MAX_INTENTOS_LOGIN:
                    auth.bloqueado_hasta = ahora + timedelta(minutes=MINUTOS_BLOQUEO_LOGIN)
                    auth.intentos_fallidos = 0
                auth.save(update_fields=['intentos_fallidos', 'bloqueado_hasta'])

                return Response(
                    {'error': 'Credenciales incorrectas'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not auth.is_active:
                return Response(
                    {'error': 'Esta cuenta está desactivada.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if not auth.verificado:
                return Response({
                    'error': 'Debes confirmar tu correo antes de iniciar sesión.',
                    'requiere_verificacion': True,
                    'email': auth.email,
                }, status=status.HTTP_403_FORBIDDEN)

            auth.intentos_fallidos = 0
            auth.bloqueado_hasta = None
            auth.ultimo_login = ahora
            auth.save(update_fields=['intentos_fallidos', 'bloqueado_hasta', 'ultimo_login'])

            refresh = RefreshToken.for_user(auth)
            usuario = Usuario.objects.get(auth=auth)

            return Response({
                'token': str(refresh.access_token),
                'refresh': str(refresh),
                'mensaje': 'Login exitoso',
                'nombre': usuario.nombre,
                'username': usuario.username
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


# CUENTA DEL USUARIO AUTENTICADO: ver, configurar y eliminar
class UsuarioMeView(APIView):
    permission_classes = [IsAuthenticated]

    def _usuario(self, request):
        return get_object_or_404(Usuario.objects.select_related('auth'), auth=request.user)

    def get(self, request):
        usuario = self._usuario(request)
        usuario.revisar_vencimiento()
        return Response(ConfiguracionSerializer(usuario).data)

    def patch(self, request):
        usuario = self._usuario(request)
        era_privada = usuario.cuenta_privada
        peso_antes, altura_antes = usuario.peso, usuario.altura

        serializer = ConfiguracionSerializer(usuario, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():
                usuario = serializer.save()

                # Si cambió el peso o la altura, queda en el historial de Progreso
                if {'peso', 'altura'} & set(serializer.validated_data) and (
                    usuario.peso != peso_antes or usuario.altura != altura_antes
                ):
                    registrar_peso(usuario)

                # Como en Instagram: al hacer pública la cuenta se aceptan las solicitudes pendientes
                if era_privada and not usuario.cuenta_privada:
                    Seguimiento.objects.filter(
                        seguido=usuario, estado=Seguimiento.PENDIENTE,
                    ).update(estado=Seguimiento.ACEPTADO, aceptado_at=timezone.now())
        except IntegrityError:
            return Response(
                {'username': ['Ese nombre de usuario ya está en uso.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(ConfiguracionSerializer(usuario).data)

    def delete(self, request):
        """Elimina la cuenta y todos sus datos. Pide la contraseña para confirmar."""
        usuario = self._usuario(request)

        if not usuario.auth.check_password(request.data.get('password') or ''):
            return Response(
                {'error': 'La contraseña no es correcta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        auth = request.user

        if not auth.check_password(serializer.validated_data['actual']):
            return Response(
                {'actual': ['La contraseña actual no es correcta.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        auth.set_password(serializer.validated_data['nueva'])
        auth.save(update_fields=['password'])
        return Response({'mensaje': 'Contraseña actualizada.'})


# FOTO DE PERFIL: subir (POST, campo "foto") o quitar (DELETE)
class FotoPerfilView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        archivo = request.FILES.get('foto')
        if archivo is None:
            return Response({'error': 'Elige una foto.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            foto = procesar_foto(archivo)
        except FotoInvalida as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        borrar_foto(usuario)  # la anterior no se queda ocupando espacio
        usuario.foto.save(foto.name, foto, save=False)
        usuario.save(update_fields=['foto'])
        return Response({'foto': url_foto(usuario)})

    def delete(self, request):
        usuario = get_object_or_404(Usuario, auth=request.user)
        borrar_foto(usuario)
        usuario.save(update_fields=['foto'])
        return Response({'foto': None})


# Comprobar si un @username está libre (se usa en el registro)
class UsernameDisponibleView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            username = validar_username(request.query_params.get('username', ''))
        except ValidationError as e:
            return Response({'disponible': False, 'mensaje': str(e.detail[0])})

        return Response({'disponible': True, 'username': username})


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

        if not settings.WOMPI_EVENTS_SECRET:
            # Sin el secreto no se puede verificar la firma del evento
            return Response(
                {'error': 'Wompi no está configurado en el servidor.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

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

            # atomic se importa aparte: aquí "transaction" es la transacción de Wompi
            with atomic():
                pago.estado = 'aprobado'
                pago.save(update_fields=['estado'])
                # Antes el pago quedaba aprobado pero el plan del usuario nunca cambiaba
                pago.usuario.activar_plan(pago.plan)

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

        return Response(activar_cuenta(auth))

    def get(self, request, token):
        return self._verificar(request, token)

    def post(self, request, token):
        return self._verificar(request, token)


# VERIFICAR CON EL CÓDIGO DE 6 DÍGITOS DEL CORREO
class VerificarCodigoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        codigo = ''.join(c for c in str(request.data.get('codigo') or '') if c.isdigit())

        if not email or len(codigo) != 6:
            return Response(
                {'error': 'Escribe el código de 6 dígitos que te llegó al correo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        auth = AuthUsuario.objects.filter(email__iexact=email).first()
        if auth is None:
            return Response(
                {'error': 'El código no es válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if auth.verificado:
            return Response({'mensaje': 'Esta cuenta ya estaba verificada. Inicia sesión.', 'ya_verificada': True})

        if not auth.codigo_verificacion or not token_vigente(auth):
            return Response(
                {'error': 'El código venció. Pide uno nuevo.', 'expirado': True},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not secrets.compare_digest(codigo, auth.codigo_verificacion):
            auth.intentos_codigo += 1
            restantes = MAX_INTENTOS_CODIGO - auth.intentos_codigo

            if restantes <= 0:
                # Demasiados intentos: el código deja de servir y hay que pedir otro
                auth.codigo_verificacion = None
                auth.save(update_fields=['intentos_codigo', 'codigo_verificacion'])
                return Response(
                    {'error': 'Demasiados intentos. Pide un código nuevo.', 'expirado': True},
                    status=status.HTTP_400_BAD_REQUEST
                )

            auth.save(update_fields=['intentos_codigo'])
            return Response(
                {'error': f'Código incorrecto. Te quedan {restantes} intentos.', 'intentos_restantes': restantes},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(activar_cuenta(auth))


def activar_cuenta(auth):
    """Marca la cuenta como verificada y devuelve la sesión iniciada."""
    auth.verificado = True
    auth.token = None
    auth.token_expira = None
    auth.codigo_verificacion = None
    auth.intentos_codigo = 0
    auth.save(update_fields=['verificado', 'token', 'token_expira', 'codigo_verificacion', 'intentos_codigo'])

    refresh = RefreshToken.for_user(auth)
    usuario = Usuario.objects.filter(auth=auth).first()

    return {
        'mensaje': 'Cuenta verificada correctamente.',
        'token': str(refresh.access_token),
        'refresh': str(refresh),
        'nombre': usuario.nombre if usuario else '',
        'username': usuario.username if usuario else '',
    }


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
            auth = AuthUsuario.objects.get(email__iexact=email.strip())
        except AuthUsuario.DoesNotExist:
            return Response(
                {'error': 'No encontramos una cuenta con ese correo.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if auth.verificado:
            return Response({'mensaje': 'Esta cuenta ya está verificada.'})

        espera = segundos_para_reenviar(auth)
        if espera:
            return Response(
                {'error': f'Espera {espera} segundos para pedir otro correo.', 'espera_segundos': espera},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            usuario = Usuario.objects.get(auth=auth)
            nombre = usuario.nombre
        except Usuario.DoesNotExist:
            nombre = ''

        enviado = enviar_correo_verificacion(auth, nombre=nombre)

        return Response({
            'mensaje': 'Te reenviamos el correo de confirmación.',
            **datos_envio(auth, enviado),
        })
