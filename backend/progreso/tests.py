from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from entrenamientos.models import RegistroEntrenamiento
from users.models import AuthUsuario, Usuario

from .models import ImcHistorial, MedidaCorporal


class ProgresoTests(APITestCase):
    def setUp(self):
        auth = AuthUsuario.objects.create_user(email='ana@test.com', password='Clave12345')
        self.usuario = Usuario.objects.create(auth=auth, nombre='Ana', username='ana', peso=70, altura=1.75)
        token = RefreshToken.for_user(auth).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def entrenar(self, dias_atras, volumen=1000, records=None):
        RegistroEntrenamiento.objects.create(
            usuario=self.usuario, nombre='Sesión', fecha=timezone.now() - timedelta(days=dias_atras),
            duracion_segundos=3600, series_completadas=10, volumen_kg=volumen, records=records or [],
        )

    def test_sin_datos(self):
        datos = self.client.get('/api/progreso/').data
        self.assertEqual(datos['perfil']['imc'], 22.9)
        # El peso del perfil queda como primer punto del historial
        self.assertEqual(len(datos['historial_peso']), 1)
        self.assertEqual(datos['totales']['entrenamientos'], 0)
        self.assertFalse(any(l['obtenido'] for l in datos['logros']))

    def test_racha_semana_y_logros(self):
        for dias in (0, 1, 2, 5):
            self.entrenar(dias, volumen=3000)
        self.entrenar(9, records=[{'ejercicio': 'Sentadilla', 'tipo': 'peso', 'valor': 90, 'anterior': 85}])

        datos = self.client.get('/api/progreso/').data
        totales = datos['totales']
        self.assertEqual(totales['entrenamientos'], 5)
        self.assertEqual(totales['racha'], 3)
        self.assertEqual(totales['dias_semana'], 4)
        self.assertEqual(totales['volumen'], 13000)
        self.assertEqual(sum(d['entrenado'] for d in datos['semana']), 4)
        self.assertEqual(datos['records_recientes'][0]['ejercicio'], 'Sentadilla')

        obtenidos = {l['id'] for l in datos['logros'] if l['obtenido']}
        self.assertEqual(obtenidos, {'primer', 'racha3', 'record', 'volumen'})

    def test_racha_cuenta_desde_ayer_si_hoy_no_entreno(self):
        self.entrenar(1)
        self.entrenar(2)
        self.assertEqual(self.client.get('/api/progreso/').data['totales']['racha'], 2)

    def test_registrar_peso(self):
        respuesta = self.client.post('/api/progreso/peso/', {'peso': 68.5}, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['imc'], 22.4)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.peso, 68.5)
        self.assertEqual(self.client.post('/api/progreso/peso/', {'peso': 5}, format='json').status_code, 400)

    def test_cambiar_peso_en_configuracion_queda_en_el_historial(self):
        self.client.patch('/api/usuarios/me/', {'peso': 71}, format='json')
        self.client.patch('/api/usuarios/me/', {'nombre': 'Ana María'}, format='json')  # sin cambio de peso
        self.assertEqual(list(ImcHistorial.objects.values_list('peso', flat=True)), [71])


class MedidasTests(APITestCase):
    def setUp(self):
        auth = AuthUsuario.objects.create_user(email='ana@test.com', password='Clave12345')
        self.usuario = Usuario.objects.create(auth=auth, nombre='Ana', username='ana', peso=70, altura=1.75)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(auth).access_token}')

    def test_registrar_y_listar(self):
        respuesta = self.client.post('/api/progreso/medidas/', {'cintura': '82,5', 'grasa_corporal': 18}, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['cintura'], 82.5)

        medidas = self.client.get('/api/progreso/medidas/').data['medidas']
        self.assertEqual(len(medidas), 1)
        self.assertEqual(medidas[0]['grasa_corporal'], 18)
        self.assertIsNone(medidas[0]['pecho'])

    def test_el_mismo_dia_completa_el_registro(self):
        self.client.post('/api/progreso/medidas/', {'cintura': 82}, format='json')
        respuesta = self.client.post('/api/progreso/medidas/', {'pecho': 100, 'cintura': 81}, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(MedidaCorporal.objects.count(), 1)
        medida = MedidaCorporal.objects.get()
        self.assertEqual((medida.pecho, medida.cintura), (100, 81))

    def test_otro_dia_crea_otro_registro(self):
        anterior = MedidaCorporal.objects.create(usuario=self.usuario, cintura=85)
        MedidaCorporal.objects.filter(id=anterior.id).update(fecha=timezone.now() - timedelta(days=7))
        self.client.post('/api/progreso/medidas/', {'cintura': 83}, format='json')
        medidas = self.client.get('/api/progreso/medidas/').data['medidas']
        self.assertEqual([m['cintura'] for m in medidas], [85, 83])

    def test_validaciones(self):
        self.assertEqual(self.client.post('/api/progreso/medidas/', {}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/progreso/medidas/', {'cintura': 800}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/progreso/medidas/', {'grasa_corporal': 90}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/progreso/medidas/', {'pecho': 'mucho'}, format='json').status_code, 400)

    def test_borrar_solo_las_propias(self):
        mia = MedidaCorporal.objects.create(usuario=self.usuario, cintura=80)
        otro_auth = AuthUsuario.objects.create_user(email='beto@test.com', password='Clave12345')
        otro = Usuario.objects.create(auth=otro_auth, nombre='Beto', username='beto')
        ajena = MedidaCorporal.objects.create(usuario=otro, cintura=90)

        self.assertEqual(self.client.delete(f'/api/progreso/medidas/{ajena.id}/').status_code, 404)
        self.assertEqual(self.client.delete(f'/api/progreso/medidas/{mia.id}/').status_code, 204)
        self.assertTrue(MedidaCorporal.objects.filter(id=ajena.id).exists())
