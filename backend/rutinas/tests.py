from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import AuthUsuario, Ejercicio, Usuario

from .models import Rutina


def crear_usuario(username, staff=False):
    auth = AuthUsuario.objects.create_user(email=f'{username}@test.com', password='Clave12345')
    auth.verificado = True
    auth.is_staff = staff
    auth.save()
    return Usuario.objects.create(auth=auth, nombre=username.title(), username=username)


class BaseRutinasTest(APITestCase):
    def setUp(self):
        self.ana = crear_usuario('ana')
        self.beto = crear_usuario('beto')
        self.rutina_beto = Rutina.objects.create(usuario=self.beto, nombre='Rutina de Beto')
        self.ejercicio = Ejercicio.objects.create(nombre='Sentadilla', grupo='upper_legs', repdb_id='1')

    def entrar_como(self, usuario):
        token = RefreshToken.for_user(usuario.auth).access_token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')


class RutinasPropiasTests(BaseRutinasTest):
    def test_no_se_ven_ni_tocan_rutinas_ajenas(self):
        self.entrar_como(self.ana)
        base = f'/api/usuarios/{self.beto.id}/rutinas/'
        detalle = f'{base}{self.rutina_beto.id}/'

        self.assertEqual(self.client.get(base).status_code, 404)
        self.assertEqual(self.client.post(base, {'nombre': 'Intrusa'}, format='json').status_code, 404)
        self.assertEqual(self.client.get(detalle).status_code, 404)
        self.assertEqual(self.client.put(detalle, {'nombre': 'X'}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(detalle).status_code, 404)
        self.assertEqual(self.client.patch(f'{detalle}favorita/').status_code, 404)
        self.assertEqual(
            self.client.post(f'{detalle}ejercicios/', {'ejercicio_id': self.ejercicio.id}, format='json').status_code,
            404,
        )
        self.assertTrue(Rutina.objects.filter(id=self.rutina_beto.id, nombre='Rutina de Beto').exists())

    def test_el_dueno_si_puede(self):
        self.entrar_como(self.beto)
        respuesta = self.client.get(f'/api/usuarios/{self.beto.id}/rutinas/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn('Rutina de Beto', [r['nombre'] for r in respuesta.data])
        self.assertFalse(respuesta.data[0]['es_plantilla'])

    def test_las_rutinas_base_se_marcan_como_plantilla(self):
        self.entrar_como(self.beto)
        self.client.post('/api/rutinas/generar-catalogo/')
        datos = self.client.get(f'/api/usuarios/{self.beto.id}/rutinas/').data
        plantillas = {r['nombre'] for r in datos if r['es_plantilla']}
        self.assertIn('Cuerpo completo', plantillas)
        self.assertNotIn('Rutina de Beto', plantillas)

    def test_catalogo_base_es_para_el_usuario_con_sesion(self):
        self.entrar_como(self.ana)
        # Aunque mande el id de otra persona, el catálogo se crea para quien tiene la sesión
        self.client.post('/api/rutinas/generar-catalogo/', {'usuario_id': self.beto.id}, format='json')
        self.assertFalse(Rutina.objects.filter(usuario=self.beto).exclude(id=self.rutina_beto.id).exists())


class BibliotecaTests(BaseRutinasTest):
    def test_usuario_normal_no_modifica_la_biblioteca(self):
        self.entrar_como(self.ana)
        url = f'/api/ejercicios/{self.ejercicio.id}/'
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.put(url, {'nombre': 'Hackeada', 'grupo': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertTrue(Ejercicio.objects.filter(nombre='Sentadilla').exists())

    def test_administrador_si(self):
        admin = crear_usuario('admin', staff=True)
        self.entrar_como(admin)
        url = f'/api/ejercicios/{self.ejercicio.id}/'
        self.assertEqual(self.client.put(url, {'nombre': 'Sentadilla trasera', 'grupo': 'upper_legs'}, format='json').status_code, 200)

    def test_cuentas_nuevas_no_son_administradoras(self):
        self.assertFalse(self.ana.auth.is_staff)
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/usuarios/').status_code, 403)


class RutinaAjenaConMiIdTests(BaseRutinasTest):
    def test_con_mi_usuario_en_la_url_tampoco_se_toca_una_rutina_ajena(self):
        self.entrar_como(self.ana)
        url = f'/api/usuarios/{self.ana.id}/rutinas/{self.rutina_beto.id}/'
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.put(url, {'nombre': 'Robada'}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertTrue(Rutina.objects.filter(id=self.rutina_beto.id, nombre='Rutina de Beto').exists())
