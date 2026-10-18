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
