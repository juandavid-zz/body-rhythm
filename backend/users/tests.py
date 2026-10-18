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
