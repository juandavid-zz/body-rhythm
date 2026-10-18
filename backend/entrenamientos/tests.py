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


def serie(peso, reps, hecho=True):
    return {'tipo': 'normal', 'reps': reps, 'peso': peso, 'pesoKg': peso, 'hecho': hecho}


class RecordsPersonalesTests(BaseChatbotTest):
    def registrar(self, *ejercicios, fecha=None):
        datos = {'nombre': 'Sesión', 'duracion_segundos': 1800, 'ejercicios': list(ejercicios)}
        if fecha:
            datos['fecha'] = fecha
        return self.client.post('/api/entrenamientos/registros/', datos, format='json').data

    def test_la_primera_vez_no_es_record(self):
        datos = self.registrar({'nombre': 'Sentadilla', 'sets': [serie(80, 5)]})
        self.assertEqual(datos['records'], [])

    def test_mas_peso_que_nunca_es_record(self):
        self.registrar({'nombre': 'Sentadilla', 'sets': [serie(80, 5), serie(85, 3)]}, fecha='2026-10-01T10:00:00Z')
        datos = self.registrar({'nombre': 'sentadilla', 'sets': [serie(90, 2)]}, fecha='2026-10-08T10:00:00Z')

        self.assertEqual(len(datos['records']), 1)
        record = datos['records'][0]
        self.assertEqual((record['tipo'], record['valor'], record['anterior']), ('peso', 90, 85))

    def test_igualar_o_bajar_no_es_record_y_series_sin_hacer_no_cuentan(self):
        self.registrar({'nombre': 'Press', 'sets': [serie(60, 8)]}, fecha='2026-10-01T10:00:00Z')
        datos = self.registrar(
            {'nombre': 'Press', 'sets': [serie(60, 10), serie(100, 1, hecho=False)]},
            fecha='2026-10-08T10:00:00Z',
        )
        self.assertEqual(datos['records'], [])

    def test_peso_corporal_cuenta_repeticiones(self):
        self.registrar({'nombre': 'Dominadas', 'sets': [serie(0, 8)]}, fecha='2026-10-01T10:00:00Z')
        datos = self.registrar({'nombre': 'Dominadas', 'sets': [serie(0, 10)]}, fecha='2026-10-08T10:00:00Z')
        self.assertEqual(datos['records'][0]['tipo'], 'reps')
        self.assertEqual(datos['records'][0]['valor'], 10)

    def test_por_tiempo_cuenta_la_serie_mas_larga(self):
        plancha = lambda segundos: {
            'nombre': 'Plancha', 'porTiempo': True,
            'sets': [{'tipo': 'normal', 'duracionSegundos': segundos, 'hecho': True}],
        }
        self.registrar(plancha(60), fecha='2026-10-01T10:00:00Z')
        datos = self.registrar(plancha(90), fecha='2026-10-08T10:00:00Z')
        self.assertEqual((datos['records'][0]['tipo'], datos['records'][0]['valor']), ('tiempo', 90))

    def test_solo_compara_con_entrenamientos_anteriores(self):
        # Un entrenamiento registrado con fecha posterior no cuenta como "anterior"
        self.registrar({'nombre': 'Remo', 'sets': [serie(100, 5)]}, fecha='2026-10-20T10:00:00Z')
        self.registrar({'nombre': 'Remo', 'sets': [serie(50, 5)]}, fecha='2026-10-01T10:00:00Z')
        datos = self.registrar({'nombre': 'Remo', 'sets': [serie(60, 5)]}, fecha='2026-10-08T10:00:00Z')
        self.assertEqual(datos['records'][0]['anterior'], 50)

    def test_records_de_otro_usuario_no_cuentan(self):
        otro = AuthUsuario.objects.create_user(email='otro@test.com', password='Clave12345')
        otro_usuario = Usuario.objects.create(auth=otro, nombre='Otro', username='otro')
        from entrenamientos.models import RegistroEntrenamiento
        RegistroEntrenamiento.objects.create(
            usuario=otro_usuario, nombre='X', ejercicios=[{'nombre': 'Curl', 'series': [{'peso_kg': 50, 'reps': 5, 'hecho': True}]}],
        )
        datos = self.registrar({'nombre': 'Curl', 'sets': [serie(20, 10)]})
        self.assertEqual(datos['records'], [])
