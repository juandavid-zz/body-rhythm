from unittest import mock

from django.test import override_settings
from django.core.cache import cache
from rest_framework.test import APITestCase as _APITestCase


class APITestCase(_APITestCase):
    """Cada prueba empieza con la caché limpia: los límites por IP no se arrastran entre pruebas."""

    def _pre_setup(self):
        super()._pre_setup()
        cache.clear()

from .models import AuthUsuario

SMTP = 'django.core.mail.backends.smtp.EmailBackend'
CONSOLA = 'django.core.mail.backends.console.EmailBackend'


class CorreoVerificacionTests(APITestCase):
    def registrar(self):
        return self.client.post('/api/registro/', {
            'nombre': 'Prueba', 'username': 'prueba', 'email': 'prueba@test.com', 'password': 'Clave12345',
        }, format='json')

    @override_settings(EMAIL_BACKEND=CONSOLA, MOSTRAR_ENLACE_VERIFICACION=True)
    def test_con_la_opcion_activa_devuelve_el_enlace(self):
        respuesta = self.registrar()
        auth = AuthUsuario.objects.get()

        self.assertEqual(respuesta.status_code, 201)
        self.assertFalse(respuesta.data['correo_enviado'])
        self.assertTrue(respuesta.data['enlace_desarrollo'].endswith(f'/verificar/{auth.token}'))

    @override_settings(EMAIL_BACKEND=CONSOLA, MOSTRAR_ENLACE_VERIFICACION=False)
    def test_por_defecto_no_expone_el_enlace(self):
        respuesta = self.registrar()
        self.assertFalse(respuesta.data['correo_enviado'])
        self.assertNotIn('enlace_desarrollo', respuesta.data)

    @override_settings(EMAIL_BACKEND=SMTP, MOSTRAR_ENLACE_VERIFICACION=True)
    def test_con_smtp_envia_el_correo_y_nunca_el_enlace(self):
        # Se simula el envío para no conectarse a Gmail durante las pruebas
        with mock.patch('django.core.mail.EmailMultiAlternatives.send', return_value=1) as enviar:
            respuesta = self.registrar()
        enviar.assert_called_once()
        self.assertTrue(respuesta.data['correo_enviado'])
        self.assertNotIn('enlace_desarrollo', respuesta.data)

    @override_settings(EMAIL_BACKEND=CONSOLA, MOSTRAR_ENLACE_VERIFICACION=True)
    def test_enlace_verifica_la_cuenta_y_permite_login(self):
        self.registrar()
        auth = AuthUsuario.objects.get()

        login_antes = self.client.post('/api/login/', {'email': 'prueba', 'password': 'Clave12345'}, format='json')
        self.assertEqual(login_antes.status_code, 403)

        verificacion = self.client.get(f'/api/verificar/{auth.token}/')
        self.assertEqual(verificacion.status_code, 200)
        self.assertIn('refresh', verificacion.data)

        login = self.client.post('/api/login/', {'email': 'prueba', 'password': 'Clave12345'}, format='json')
        self.assertEqual(login.status_code, 200)


@override_settings(EMAIL_BACKEND=CONSOLA, MOSTRAR_ENLACE_VERIFICACION=False)
class CodigoVerificacionTests(APITestCase):
    def setUp(self):
        self.client.post('/api/registro/', {
            'nombre': 'Prueba', 'username': 'prueba', 'email': 'prueba@test.com', 'password': 'Clave12345',
        }, format='json')
        self.auth = AuthUsuario.objects.get()

    def verificar(self, codigo, email='prueba@test.com'):
        return self.client.post('/api/verificar-codigo/', {'email': email, 'codigo': codigo}, format='json')

    def codigo_incorrecto(self):
        return '000000' if self.auth.codigo_verificacion != '000000' else '111111'

    def test_codigo_correcto_activa_la_cuenta_e_inicia_sesion(self):
        respuesta = self.verificar(self.auth.codigo_verificacion, email='PRUEBA@test.com')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['username'], 'prueba')
        self.assertIn('refresh', respuesta.data)
        self.auth.refresh_from_db()
        self.assertTrue(self.auth.verificado)
        self.assertIsNone(self.auth.codigo_verificacion)

    def test_codigo_incorrecto_descuenta_intentos(self):
        respuesta = self.verificar(self.codigo_incorrecto())
        self.assertEqual(respuesta.status_code, 400)
        self.assertEqual(respuesta.data['intentos_restantes'], 4)

    def test_tras_cinco_fallos_el_codigo_deja_de_servir(self):
        codigo = self.auth.codigo_verificacion
        for _ in range(5):
            respuesta = self.verificar(self.codigo_incorrecto())
        self.assertTrue(respuesta.data['expirado'])

        # Ni el código correcto sirve ya: hay que pedir otro
        self.assertEqual(self.verificar(codigo).status_code, 400)
        self.auth.refresh_from_db()
        self.assertFalse(self.auth.verificado)

    def test_codigo_vencido(self):
        from datetime import timedelta
        from django.utils import timezone

        self.auth.token_expira = timezone.now() - timedelta(minutes=1)
        self.auth.save()
        respuesta = self.verificar(self.auth.codigo_verificacion)
        self.assertTrue(respuesta.data['expirado'])

    def test_reenviar_exige_esperar_y_genera_codigo_nuevo(self):
        from datetime import timedelta

        espera = self.client.post('/api/reenviar-verificacion/', {'email': 'prueba@test.com'}, format='json')
        self.assertEqual(espera.status_code, 429)

        # Simula que ya pasó más de un minuto desde el último envío
        anterior = self.auth.codigo_verificacion
        self.auth.token_expira -= timedelta(minutes=2)
        self.auth.save()
        reenvio = self.client.post('/api/reenviar-verificacion/', {'email': 'prueba@test.com'}, format='json')
        self.assertEqual(reenvio.status_code, 200)

        self.auth.refresh_from_db()
        self.assertEqual(self.auth.intentos_codigo, 0)
        self.assertNotEqual(self.auth.token_expira, None)
        self.assertEqual(len(self.auth.codigo_verificacion), 6)
        self.assertTrue(anterior)


class LoginSeguridadTests(APITestCase):
    def setUp(self):
        self.auth = AuthUsuario.objects.create_user(email='ana@test.com', password='Clave12345')
        self.auth.verificado = True
        self.auth.save()
        from .models import Usuario
        Usuario.objects.create(auth=self.auth, nombre='Ana', username='ana')

    def login(self, password):
        return self.client.post('/api/login/', {'email': 'ana', 'password': password}, format='json')

    def test_bloqueo_tras_cinco_intentos_fallidos(self):
        for _ in range(5):
            self.assertEqual(self.login('mala').status_code, 401)
        # Bloqueada: ni con la contraseña correcta entra
        bloqueado = self.login('Clave12345')
        self.assertEqual(bloqueado.status_code, 429)
        self.assertIn('minutos', bloqueado.data['error'])

    def test_al_vencer_el_bloqueo_puede_entrar_y_se_reinicia(self):
        from datetime import timedelta
        from django.utils import timezone
        self.auth.bloqueado_hasta = timezone.now() - timedelta(minutes=1)
        self.auth.save()
        self.assertEqual(self.login('Clave12345').status_code, 200)
        self.auth.refresh_from_db()
        self.assertIsNone(self.auth.bloqueado_hasta)

    def test_cuenta_desactivada_no_entra(self):
        self.auth.is_active = False
        self.auth.save()
        self.assertEqual(self.login('Clave12345').status_code, 403)


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RecuperarPasswordTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()  # el límite por IP se guarda en la caché
        self.auth = AuthUsuario.objects.create_user(email='ana@test.com', password='Clave12345')
        self.auth.verificado = True
        self.auth.save()
        from .models import Usuario
        Usuario.objects.create(auth=self.auth, nombre='Ana', username='ana')

    def pedir(self, email='ana@test.com'):
        return self.client.post('/api/recuperar-password/', {'email': email}, format='json')

    def restablecer(self, codigo, password='NuevaClave123'):
        return self.client.post('/api/restablecer-password/', {
            'email': 'ana@test.com', 'codigo': codigo, 'password': password,
        }, format='json')

    def codigo(self):
        self.auth.refresh_from_db()
        return self.auth.codigo_recuperacion

    def test_envia_el_codigo_por_correo(self):
        from django.core import mail
        respuesta = self.pedir()
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.codigo(), mail.outbox[0].body)

    def test_no_revela_si_el_correo_existe(self):
        from django.core import mail
        existe, no_existe = self.pedir(), self.pedir('nadie@test.com')
        self.assertEqual(existe.data, no_existe.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_con_el_codigo_cambia_la_contrasena_y_desbloquea(self):
        from django.utils import timezone
        self.pedir()
        self.auth.refresh_from_db()
        self.auth.intentos_fallidos = 5
        self.auth.bloqueado_hasta = timezone.now() + timezone.timedelta(minutes=10)
        self.auth.save()

        self.assertEqual(self.restablecer(self.codigo()).status_code, 200)
        self.auth.refresh_from_db()
        self.assertTrue(self.auth.check_password('NuevaClave123'))
        self.assertIsNone(self.auth.bloqueado_hasta)
        self.assertIsNone(self.auth.codigo_recuperacion)
        # El código solo sirve una vez
        self.assertEqual(self.restablecer('000000').status_code, 400)
        login = self.client.post('/api/login/', {'email': 'ana', 'password': 'NuevaClave123'}, format='json')
        self.assertEqual(login.status_code, 200)

    def test_codigo_incorrecto_cuenta_intentos_y_se_invalida(self):
        self.pedir()
        correcto = self.codigo()
        malo = '000000' if correcto != '000000' else '111111'
        for _ in range(4):
            self.assertIn('intentos_restantes', self.restablecer(malo).data)
        self.assertTrue(self.restablecer(malo).data['expirado'])
        # Ya ni el correcto sirve: hay que pedir otro
        self.assertEqual(self.restablecer(correcto).status_code, 400)
        self.auth.refresh_from_db()
        self.assertTrue(self.auth.check_password('Clave12345'))

    def test_codigo_vencido_no_sirve(self):
        from django.utils import timezone
        self.pedir()
        codigo = self.codigo()
        self.auth.recuperacion_expira = timezone.now() - timezone.timedelta(minutes=1)
        self.auth.save()
        self.assertTrue(self.restablecer(codigo).data['expirado'])

    def test_contrasena_corta_se_rechaza(self):
        self.pedir()
        self.assertEqual(self.restablecer(self.codigo(), password='corta').status_code, 400)

    def test_no_reenvia_antes_de_un_minuto(self):
        from django.core import mail
        self.pedir()
        primero = self.codigo()
        self.pedir()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(self.codigo(), primero)


@override_settings(WOMPI_EVENTS_SECRET='secreto_de_prueba')
class PlanPagadoTests(APITestCase):
    def setUp(self):
        from .models import Pago, Usuario
        auth = AuthUsuario.objects.create_user(email='ana@test.com', password='Clave12345')
        self.usuario = Usuario.objects.create(auth=auth, nombre='Ana', username='ana')
        self.pago = Pago.objects.create(usuario=self.usuario, plan='pro', precio=19900, referencia='BR-1', metodo='tarjeta')

    def evento(self, estado='APPROVED', referencia='BR-1', monto=1990000):
        import hashlib
        timestamp = 1700000000
        transaccion = {'id': 'tx1', 'status': estado, 'amount_in_cents': monto, 'reference': referencia, 'currency': 'COP'}
        propiedades = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents']
        cadena = f"tx1{estado}{monto}{timestamp}secreto_de_prueba"
        return {
            'event': 'transaction.updated',
            'data': {'transaction': transaccion},
            'timestamp': timestamp,
            'signature': {'properties': propiedades, 'checksum': hashlib.sha256(cadena.encode()).hexdigest()},
        }

    def test_pago_aprobado_activa_el_plan_30_dias(self):
        respuesta = self.client.post('/api/pagos/webhook/', self.evento(), format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.plan, 'pro')
        self.assertEqual((self.usuario.fecha_fin_plan - self.usuario.fecha_inicio_plan).days, 30)

    def test_firma_invalida_no_activa_nada(self):
        evento = self.evento()
        evento['signature']['checksum'] = '0' * 64
        self.assertEqual(self.client.post('/api/pagos/webhook/', evento, format='json').status_code, 401)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.plan, 'free')

    def test_pago_rechazado_no_activa(self):
        self.client.post('/api/pagos/webhook/', self.evento(estado='DECLINED'), format='json')
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.plan, 'free')

    def test_renovar_el_mismo_plan_suma_dias(self):
        self.usuario.activar_plan('pro')
        fin_anterior = self.usuario.fecha_fin_plan
        self.usuario.activar_plan('pro')
        self.assertEqual((self.usuario.fecha_fin_plan - fin_anterior).days, 30)

    def test_plan_vencido_vuelve_a_free(self):
        from datetime import timedelta
        from django.utils import timezone
        from rest_framework_simplejwt.tokens import RefreshToken
        self.usuario.activar_plan('premium')
        self.usuario.fecha_fin_plan = timezone.now() - timedelta(days=1)
        self.usuario.save()
        token = RefreshToken.for_user(self.usuario.auth).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(self.client.get('/api/usuarios/me/').data['plan'], 'free')

    @override_settings(WOMPI_EVENTS_SECRET=None)
    def test_sin_secreto_configurado_no_revienta(self):
        # assertLogs captura el aviso de Django por el 503 (con Python 3.14, Django 4.2 falla al registrarlo)
        with self.assertLogs('django.request', level='ERROR'):
            respuesta = self.client.post('/api/pagos/webhook/', self.evento(), format='json')
        self.assertEqual(respuesta.status_code, 503)


class FotoPerfilTests(APITestCase):
    def setUp(self):
        import tempfile
        from django.test import override_settings
        from rest_framework_simplejwt.tokens import RefreshToken
        from .models import Usuario

        self.carpeta = tempfile.mkdtemp()
        self.ajuste = override_settings(MEDIA_ROOT=self.carpeta)
        self.ajuste.enable()
        self.auth = AuthUsuario.objects.create_user(email='foto@test.com', password='Clave12345')
        self.usuario = Usuario.objects.create(auth=self.auth, nombre='Foto', username='foto')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(self.auth).access_token}')

    def tearDown(self):
        import shutil
        self.ajuste.disable()
        shutil.rmtree(self.carpeta, ignore_errors=True)

    def imagen(self, ancho=800, alto=600, formato='PNG', nombre='foto.png'):
        import io
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        datos = io.BytesIO()
        Image.new('RGB', (ancho, alto), (120, 40, 200)).save(datos, formato)
        return SimpleUploadedFile(nombre, datos.getvalue(), content_type=f'image/{formato.lower()}')

    def subir(self, archivo):
        return self.client.post('/api/usuarios/me/foto/', {'foto': archivo}, format='multipart')

    def test_sube_la_foto_cuadrada_en_webp(self):
        from PIL import Image
        respuesta = self.subir(self.imagen())
        self.assertEqual(respuesta.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.foto.name.endswith('.webp'))
        with Image.open(self.usuario.foto.path) as guardada:
            self.assertEqual(guardada.size, (400, 400))
        self.assertEqual(self.client.get('/api/usuarios/me/').data['foto'], respuesta.data['foto'])

    def test_cambiar_la_foto_borra_la_anterior(self):
        import os
        self.subir(self.imagen())
        self.usuario.refresh_from_db()
        anterior = self.usuario.foto.path
        self.subir(self.imagen(formato='JPEG', nombre='otra.jpg'))
        self.assertFalse(os.path.exists(anterior))

    def test_quitar_la_foto(self):
        import os
        self.subir(self.imagen())
        self.usuario.refresh_from_db()
        ruta = self.usuario.foto.path
        self.assertIsNone(self.client.delete('/api/usuarios/me/foto/').data['foto'])
        self.usuario.refresh_from_db()
        self.assertFalse(self.usuario.foto)
        self.assertFalse(os.path.exists(ruta))

    def test_rechaza_archivos_que_no_son_imagen(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        respuesta = self.subir(SimpleUploadedFile('virus.png', b'esto no es una imagen', content_type='image/png'))
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('imagen', respuesta.data['error'])

    def test_rechaza_fotos_de_mas_de_5_mb(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        grande = SimpleUploadedFile('grande.png', b'0' * (5 * 1024 * 1024 + 1), content_type='image/png')
        self.assertIn('5 MB', self.subir(grande).data['error'])

    def test_la_foto_aparece_en_la_comunidad(self):
        respuesta = self.subir(self.imagen())
        perfil = self.client.get('/api/social/perfiles/foto/').data
        self.assertEqual(perfil['foto'], respuesta.data['foto'])

    def test_eliminar_la_cuenta_borra_la_foto(self):
        import os
        self.subir(self.imagen())
        self.usuario.refresh_from_db()
        ruta = self.usuario.foto.path
        self.auth.delete()
        self.assertFalse(os.path.exists(ruta))


class RenovarSesionTests(APITestCase):
    def test_si_la_cuenta_se_borro_responde_401_y_no_500(self):
        from rest_framework_simplejwt.tokens import RefreshToken

        auth = AuthUsuario.objects.create_user(email='borrada@test.com', password='Clave12345')
        refresh = str(RefreshToken.for_user(auth))
        ok = self.client.post('/api/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(ok.status_code, 200)

        auth.delete()
        respuesta = self.client.post('/api/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(respuesta.status_code, 401)


class LimitesPorIpTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()

    def tearDown(self):
        from django.core.cache import cache
        cache.clear()

    def test_el_login_tiene_limite_por_ip(self):
        from .views import AccesoThrottle
        with mock.patch.object(AccesoThrottle, 'rate', '3/minute'), \
                mock.patch.object(AccesoThrottle, 'num_requests', 3, create=True), \
                mock.patch.object(AccesoThrottle, 'duration', 60, create=True):
            codigos = [
                self.client.post('/api/login/', {'email': f'nadie{i}@test.com', 'password': 'x'}, format='json').status_code
                for i in range(4)
            ]
        self.assertEqual(codigos[:3], [401, 401, 401])
        self.assertEqual(codigos[3], 429)


class CorreoBrevoTests(APITestCase):
    """En Render gratis no hay SMTP: los correos salen por la API de Brevo."""

    @override_settings(EMAIL_BACKEND='users.correo_brevo.CorreoBrevo', BREVO_API_KEY='clave-de-prueba',
                       DEFAULT_FROM_EMAIL='Body Rhythm <hola@ejemplo.com>')
    def test_envia_por_la_api_con_html_y_remitente(self):
        from django.core.mail import EmailMultiAlternatives

        respuesta = mock.Mock(status_code=201)
        respuesta.raise_for_status.return_value = None
        with mock.patch('users.correo_brevo.requests.post', return_value=respuesta) as post:
            mensaje = EmailMultiAlternatives('Asunto', 'texto', to=['ana@test.com'])
            mensaje.attach_alternative('<b>hola</b>', 'text/html')
            self.assertEqual(mensaje.send(), 1)

        datos = post.call_args.kwargs['json']
        self.assertEqual(post.call_args.kwargs['headers']['api-key'], 'clave-de-prueba')
        self.assertEqual(datos['sender'], {'email': 'hola@ejemplo.com', 'name': 'Body Rhythm'})
        self.assertEqual(datos['to'], [{'email': 'ana@test.com'}])
        self.assertEqual(datos['htmlContent'], '<b>hola</b>')

        from .emails import correo_configurado
        self.assertTrue(correo_configurado())


class CargarBibliotecaTests(APITestCase):
    def test_carga_los_ejercicios_solo_si_no_hay(self):
        from django.core.management import call_command
        from .models import Ejercicio

        call_command('cargar_biblioteca', stdout=mock.Mock())
        self.assertEqual(Ejercicio.objects.count(), 376)

        Ejercicio.objects.filter(pk=1).update(nombre='Cambiado en el admin')
        call_command('cargar_biblioteca', stdout=mock.Mock())
        self.assertEqual(Ejercicio.objects.get(pk=1).nombre, 'Cambiado en el admin')
