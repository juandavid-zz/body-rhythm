from unittest import mock

from django.test import override_settings
from rest_framework.test import APITestCase

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
