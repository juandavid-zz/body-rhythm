from unittest import mock

from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from rutinas.models import Rutina
from users.models import AuthUsuario, Ejercicio, Usuario

from . import chatbot_service
from .rutina_ia import vincular_ejercicios


class BaseChatbotTest(APITestCase):
    def setUp(self):
        auth = AuthUsuario.objects.create_user(email='ana@test.com', password='Clave12345')
        auth.verificado = True
        auth.save()
        self.usuario = Usuario.objects.create(
            auth=auth, nombre='Ana', username='ana', peso=70, altura=1.75, meta='ganar_musculo',
        )
        token = RefreshToken.for_user(auth).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        self.sentadilla = Ejercicio.objects.create(nombre='Sentadilla con Barra', grupo='upper_legs', repdb_id='1')
        self.press = Ejercicio.objects.create(nombre='Press de Banca', grupo='chest', repdb_id='2')
        self.remo = Ejercicio.objects.create(nombre='Remo con Mancuerna', grupo='back', repdb_id='3')


class GuardarRutinaTests(BaseChatbotTest):
    def rutina(self):
        return {
            'nombre': 'Fuerza total',
            'objetivo': 'Ganar fuerza',
            'ejercicios': [
                {'dia': 'Día 1', 'ejercicio_id': self.sentadilla.id, 'nombre': 'Sentadilla', 'series': 4, 'repeticiones': 8, 'descanso_segundos': 90},
                {'dia': 'Día 1', 'ejercicio_id': None, 'nombre': 'press de banca', 'series': 3, 'repeticiones': 10},
                {'dia': 'Día 2', 'ejercicio_id': 9999, 'nombre': 'Remo con mancuerna', 'series': '3', 'repeticiones': '12'},
                {'dia': 'Día 2', 'nombre': 'Burpees inventados', 'series': 3, 'repeticiones': 10},
            ],
        }

    def test_crea_una_rutina_por_dia_con_ejercicios_de_la_biblioteca(self):
        respuesta = self.client.post('/api/entrenamientos/chatbot/guardar/', {'rutina': self.rutina()}, format='json')

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual([r['nombre'] for r in respuesta.data['rutinas']], ['Fuerza total · Día 1', 'Fuerza total · Día 2'])
        self.assertEqual(respuesta.data['omitidos'], ['Burpees inventados'])

        dia1 = Rutina.objects.get(nombre='Fuerza total · Día 1')
        self.assertEqual(dia1.usuario, self.usuario)
        relaciones = list(dia1.rutinaejercicio_set.order_by('orden'))
        self.assertEqual([r.ejercicio for r in relaciones], [self.sentadilla, self.press])
        self.assertEqual((relaciones[0].series, relaciones[0].repeticiones, relaciones[0].descanso_segundos), (4, 8, 90))

        # El id inexistente (9999) se corrige buscando por nombre, sin importar tildes ni mayúsculas
        dia2 = Rutina.objects.get(nombre='Fuerza total · Día 2')
        self.assertEqual([r.ejercicio for r in dia2.rutinaejercicio_set.all()], [self.remo])

    def test_aparece_en_las_rutinas_del_usuario(self):
        self.client.post('/api/entrenamientos/chatbot/guardar/', {'rutina': self.rutina()}, format='json')
        rutinas = self.client.get(f'/api/usuarios/{self.usuario.id}/rutinas/').data
        nombres = [r['nombre'] for r in rutinas]
        # El Día 1 aparece antes que el Día 2
        self.assertLess(nombres.index('Fuerza total · Día 1'), nombres.index('Fuerza total · Día 2'))

    def test_sin_ejercicios_de_la_biblioteca_no_guarda(self):
        rutina = {'nombre': 'X', 'ejercicios': [{'dia': 'Día 1', 'nombre': 'Inventado'}]}
        respuesta = self.client.post('/api/entrenamientos/chatbot/guardar/', {'rutina': rutina}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertFalse(Rutina.objects.exists())

    def test_rutina_invalida(self):
        respuesta = self.client.post('/api/entrenamientos/chatbot/guardar/', {'rutina': 'hola'}, format='json')
        self.assertEqual(respuesta.status_code, 400)

    def test_requiere_sesion(self):
        self.client.credentials()
        respuesta = self.client.post('/api/entrenamientos/chatbot/guardar/', {'rutina': self.rutina()}, format='json')
        self.assertEqual(respuesta.status_code, 401)


class GenerarRutinaTests(BaseChatbotTest):
    def test_imc_con_altura_en_metros_o_centimetros(self):
        self.assertEqual(chatbot_service.calcular_imc(70, 1.75), 22.9)
        self.assertEqual(chatbot_service.calcular_imc(70, 175), 22.9)

    def test_vincula_los_ejercicios_que_elige_la_ia(self):
        rutina = vincular_ejercicios({'ejercicios': [
            {'ejercicio_id': self.press.id, 'nombre': 'otro nombre'},
            {'ejercicio_id': 'abc', 'nombre': 'SENTADILLA CON BARRA'},
            {'nombre': 'No existe'},
        ]})
        ids = [e['ejercicio_id'] for e in rutina['ejercicios']]
        self.assertEqual(ids, [self.press.id, self.sentadilla.id, None])
        self.assertEqual(rutina['ejercicios'][0]['nombre'], 'Press de Banca')

    def test_si_la_ia_falla_usa_respaldo_de_la_biblioteca(self):
        with mock.patch.object(chatbot_service, 'generar_rutina_ia', side_effect=RuntimeError('sin IA')):
            respuesta = self.client.post('/api/entrenamientos/chatbot/', {
                'lugar': 'casa', 'equipo': 'ninguno', 'grupo_muscular': 'tren superior',
            }, format='json')

        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['fuente'], 'respaldo')
        self.assertEqual(respuesta.data['rango_imc'], 'normal')
        ids = {e['ejercicio_id'] for e in respuesta.data['rutina']['ejercicios']}
        self.assertEqual(ids, {self.press.id, self.remo.id})  # solo tren superior
