from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from entrenamientos.models import RegistroEntrenamiento
from users.models import AuthUsuario, Usuario

from .models import Seguimiento


def crear_usuario(username, nombre=None):
    auth = AuthUsuario.objects.create_user(email=f'{username}@test.com', password='Clave12345')
    auth.verificado = True
    auth.save()
    return Usuario.objects.create(auth=auth, nombre=nombre or username.title(), username=username)


ENTRENAMIENTO = {
    'nombre': 'Pierna',
    'duracionSeg': 1800,
    'duracion_segundos': 1800,
    'ejercicios': [{
        'nombre': 'Sentadilla',
        'porTiempo': False,
        'unidadPeso': 'kg',
        'sets': [
            {'tipo': 'normal', 'reps': '10', 'peso': '60', 'pesoKg': 60, 'hecho': True},
            {'tipo': 'normal', 'reps': 8, 'peso': '70', 'pesoKg': 70, 'hecho': True},
            {'tipo': 'normal', 'reps': 8, 'peso': '', 'pesoKg': '', 'hecho': False},
        ],
    }],
}


class BaseSocialTest(APITestCase):
    def setUp(self):
        self.ana = crear_usuario('ana', 'Ana Gómez')
        self.beto = crear_usuario('beto', 'Beto Ruiz')
        self.caro = crear_usuario('caro', 'Carolina Paz')

    def entrar_como(self, usuario):
        token = RefreshToken.for_user(usuario.auth).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class UsernameTests(APITestCase):
    def registrar(self, username, email):
        return self.client.post('/api/registro/', {
            'nombre': 'Prueba', 'username': username, 'email': email, 'password': 'Clave12345',
        }, format='json')

    def test_username_repetido_da_error_claro(self):
        self.assertEqual(self.registrar('Juan.Fit', 'a@test.com').status_code, 201)
        self.assertEqual(Usuario.objects.get().username, 'juan.fit')

        respuesta = self.registrar('@JUAN.fit', 'b@test.com')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('ya está en uso', respuesta.data['username'][0])

    def test_username_con_formato_invalido(self):
        respuesta = self.registrar('no vale!', 'c@test.com')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('username', respuesta.data)

    def test_disponibilidad(self):
        crear_usuario('ocupado')
        libre = self.client.get('/api/usuarios/username-disponible/', {'username': 'libre'})
        ocupado = self.client.get('/api/usuarios/username-disponible/', {'username': 'Ocupado'})
        self.assertTrue(libre.data['disponible'])
        self.assertFalse(ocupado.data['disponible'])

    def test_login_con_username_o_correo(self):
        crear_usuario('dani')
        por_username = self.client.post('/api/login/', {'email': '@Dani', 'password': 'Clave12345'}, format='json')
        por_correo = self.client.post('/api/login/', {'email': 'dani@test.com', 'password': 'Clave12345'}, format='json')
        self.assertEqual(por_username.status_code, 200)
        self.assertEqual(por_username.data['username'], 'dani')
        self.assertEqual(por_correo.status_code, 200)


class SeguimientoTests(BaseSocialTest):
    def test_flujo_solicitud_aceptar_y_dejar_de_seguir(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.post('/api/social/perfiles/beto/seguir/').data['estado'], 'pendiente')
        # Enviarla otra vez no duplica
        self.client.post('/api/social/perfiles/beto/seguir/')
        self.assertEqual(Seguimiento.objects.count(), 1)

        self.entrar_como(self.beto)
        solicitudes = self.client.get('/api/social/solicitudes/').data
        self.assertEqual(solicitudes[0]['usuario']['username'], 'ana')
        self.assertEqual(self.client.post(f"/api/social/solicitudes/{solicitudes[0]['id']}/").data['estado'], 'aceptado')

        self.entrar_como(self.ana)
        perfil = self.client.get('/api/social/perfiles/beto/').data
        self.assertEqual(perfil['relacion'], 'siguiendo')
        self.assertEqual(perfil['seguidores'], 1)

        self.client.delete('/api/social/perfiles/beto/seguir/')
        self.assertFalse(Seguimiento.objects.exists())

    def test_rechazar_y_no_seguirse_a_si_mismo(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.post('/api/social/perfiles/ana/seguir/').status_code, 400)
        self.client.post('/api/social/perfiles/beto/seguir/')

        self.entrar_como(self.beto)
        solicitud = Seguimiento.objects.get()
        self.assertEqual(self.client.delete(f'/api/social/solicitudes/{solicitud.id}/').status_code, 204)
        self.assertFalse(Seguimiento.objects.exists())

    def test_no_se_acepta_solicitud_ajena(self):
        self.entrar_como(self.ana)
        self.client.post('/api/social/perfiles/beto/seguir/')
        self.entrar_como(self.caro)
        solicitud = Seguimiento.objects.get()
        self.assertEqual(self.client.post(f'/api/social/solicitudes/{solicitud.id}/').status_code, 404)


class VisibilidadYFeedTests(BaseSocialTest):
    def setUp(self):
        super().setUp()
        self.entrar_como(self.beto)
        self.client.post('/api/entrenamientos/registros/', ENTRENAMIENTO, format='json')
        self.client.post('/api/entrenamientos/registros/', {**ENTRENAMIENTO, 'nombre': 'Oculto', 'compartido': False}, format='json')

    def test_registro_guarda_peso_reps_y_calcula_volumen(self):
        registro = RegistroEntrenamiento.objects.get(nombre='Pierna')
        serie = registro.ejercicios[0]['series'][0]
        self.assertEqual((serie['reps'], serie['peso_kg']), (10, 60))
        self.assertEqual(registro.series_completadas, 2)
        self.assertEqual(registro.series_totales, 3)
        self.assertEqual(registro.volumen_kg, 60 * 10 + 70 * 8)

    def test_sin_seguir_la_cuenta_es_privada(self):
        self.entrar_como(self.ana)
        self.assertFalse(self.client.get('/api/social/perfiles/beto/').data['puede_ver'])
        self.assertEqual(self.client.get('/api/social/perfiles/beto/entrenamientos/').status_code, 403)
        self.assertEqual(self.client.get('/api/social/perfiles/beto/seguidores/').status_code, 403)
        self.assertEqual(self.client.get('/api/social/feed/').data['resultados'], [])

    def test_pendiente_no_ve_nada(self):
        Seguimiento.objects.create(seguidor=self.ana, seguido=self.beto)
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/social/perfiles/beto/entrenamientos/').status_code, 403)

    def test_seguidor_aceptado_ve_solo_lo_compartido(self):
        Seguimiento.objects.create(seguidor=self.ana, seguido=self.beto, estado=Seguimiento.ACEPTADO)
        self.entrar_como(self.ana)

        feed = self.client.get('/api/social/feed/').data['resultados']
        self.assertEqual([p['nombre'] for p in feed], ['Pierna'])
        self.assertEqual(feed[0]['usuario']['username'], 'beto')

        perfil = self.client.get('/api/social/perfiles/beto/entrenamientos/').data['resultados']
        self.assertEqual([p['nombre'] for p in perfil], ['Pierna'])

    def test_dueno_ve_todo_y_puede_dejar_de_compartir(self):
        perfil = self.client.get('/api/social/perfiles/beto/entrenamientos/').data['resultados']
        self.assertEqual(len(perfil), 2)

        registro = RegistroEntrenamiento.objects.get(nombre='Pierna')
        self.client.patch(f'/api/entrenamientos/registros/{registro.id}/', {'compartido': False}, format='json')

        Seguimiento.objects.create(seguidor=self.ana, seguido=self.beto, estado=Seguimiento.ACEPTADO)
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/social/feed/').data['resultados'], [])

    def test_quitar_seguidor_le_quita_el_acceso(self):
        Seguimiento.objects.create(seguidor=self.ana, seguido=self.beto, estado=Seguimiento.ACEPTADO)
        self.client.delete('/api/social/perfiles/ana/seguidor/')  # como beto
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/social/perfiles/beto/entrenamientos/').status_code, 403)

    def test_no_se_edita_registro_ajeno(self):
        registro = RegistroEntrenamiento.objects.get(nombre='Pierna')
        self.entrar_como(self.ana)
        self.assertEqual(self.client.delete(f'/api/entrenamientos/registros/{registro.id}/').status_code, 404)


class BusquedaTests(BaseSocialTest):
    def test_busca_por_username_o_nombre_y_marca_relacion(self):
        Seguimiento.objects.create(seguidor=self.ana, seguido=self.caro)
        self.entrar_como(self.ana)

        por_nombre = self.client.get('/api/social/buscar/', {'q': 'ruiz'}).data
        self.assertEqual([u['username'] for u in por_nombre], ['beto'])

        por_username = self.client.get('/api/social/buscar/', {'q': '@car'}).data
        self.assertEqual(por_username[0]['username'], 'caro')
        self.assertEqual(por_username[0]['relacion'], 'pendiente')

    def test_no_se_incluye_a_si_mismo_ni_vacio(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/social/buscar/', {'q': 'ana'}).data, [])
        self.assertEqual(self.client.get('/api/social/buscar/', {'q': ''}).data, [])
