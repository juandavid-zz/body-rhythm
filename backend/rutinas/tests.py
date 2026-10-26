from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import AuthUsuario, Ejercicio, Usuario

from .models import Rutina, RutinaEjercicio


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



class FichasEntrenamientoTests(BaseRutinasTest):
    def setUp(self):
        super().setUp()
        self.rutina_ana = Rutina.objects.create(
            usuario=self.ana,
            nombre='Rutina de Ana',
        )
        self.entrar_como(self.ana)

    def test_crear_ejercicio_con_configuracion_de_series(self):
        url = (
            f'/api/usuarios/{self.ana.id}/rutinas/'
            f'{self.rutina_ana.id}/ejercicios/'
        )
        configuracion = [
            {'tipo': 'normal', 'peso': 20, 'repeticiones': 12},
            {'tipo': 'normal', 'peso': 22.5, 'repeticiones': 10},
            {'tipo': 'fallo', 'peso': 25, 'repeticiones': 8},
        ]

        respuesta = self.client.post(
            url,
            {
                'ejercicio_id': self.ejercicio.id,
                'series': 3,
                'repeticiones': 10,
                'descanso_segundos': 90,
                'configuracion_series': configuracion,
                'unidad_peso': 'kg',
                'notas': 'Controlar la técnica',
                'orden': 0,
            },
            format='json',
        )

        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(
            respuesta.data['configuracion_series'],
            configuracion,
        )
        self.assertEqual(respuesta.data['unidad_peso'], 'kg')
        self.assertEqual(respuesta.data['notas'], 'Controlar la técnica')

        ficha = RutinaEjercicio.objects.get(
            rutina=self.rutina_ana,
            ejercicio=self.ejercicio,
        )
        self.assertEqual(ficha.configuracion_series, configuracion)
        self.assertEqual(ficha.notas, 'Controlar la técnica')

    def test_actualizar_configuracion_sin_reemplazar_otros_campos(self):
        ficha = RutinaEjercicio.objects.create(
            rutina=self.rutina_ana,
            ejercicio=self.ejercicio,
            series=3,
            repeticiones=10,
            descanso_segundos=90,
            notas='Nota inicial',
        )
        url = (
            f'/api/usuarios/{self.ana.id}/rutinas/'
            f'{self.rutina_ana.id}/ejercicios/{ficha.id}/'
        )
        configuracion = [
            {'tipo': 'calentamiento', 'peso': 10, 'repeticiones': 15},
            {'tipo': 'normal', 'peso': 20, 'repeticiones': 10},
        ]

        respuesta = self.client.patch(
            url,
            {
                'configuracion_series': configuracion,
                'unidad_peso': 'lb',
                'notas': 'Subir peso progresivamente',
            },
            format='json',
        )

        self.assertEqual(respuesta.status_code, 200)
        ficha.refresh_from_db()

        self.assertEqual(ficha.configuracion_series, configuracion)
        self.assertEqual(ficha.unidad_peso, 'lb')
        self.assertEqual(ficha.notas, 'Subir peso progresivamente')
        self.assertEqual(ficha.series, 3)
        self.assertEqual(ficha.repeticiones, 10)
        self.assertEqual(ficha.descanso_segundos, 90)

    def test_no_se_puede_editar_ficha_de_otra_persona(self):
        ficha = RutinaEjercicio.objects.create(
            rutina=self.rutina_beto,
            ejercicio=self.ejercicio,
            notas='Nota de Beto',
        )
        url = (
            f'/api/usuarios/{self.ana.id}/rutinas/'
            f'{self.rutina_beto.id}/ejercicios/{ficha.id}/'
        )

        respuesta = self.client.patch(
            url,
            {'notas': 'Intento de modificación'},
            format='json',
        )

        self.assertEqual(respuesta.status_code, 404)
        ficha.refresh_from_db()
        self.assertEqual(ficha.notas, 'Nota de Beto')
