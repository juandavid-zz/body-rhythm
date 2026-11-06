from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import AuthUsuario, Usuario

from .models import PlanNutricional, RegistroComida

PRINCIPALES = {
    'Plan equilibrado',
    'Plan alto en proteína',
    'Plan energía y entrenamiento',
    'Plan balance ligero',
    'Plan mantenimiento',
}


def crear_usuario(email, username, meta='ganar_musculo'):
    auth = AuthUsuario.objects.create_user(email=email, password='Clave12345')
    usuario = Usuario.objects.create(auth=auth, nombre=username, username=username, peso=70, altura=1.75, meta=meta)
    return auth, usuario


class NutricionTests(APITestCase):
    def setUp(self):
        self.auth, self.usuario = crear_usuario('ana@test.com', 'ana')
        self.entrar(self.auth)

    def entrar(self, auth):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(auth).access_token}')

    def planes(self):
        respuesta = self.client.get('/api/nutricion/planes/')
        self.assertEqual(respuesta.status_code, 200)
        return respuesta.data

    def comida_de(self, nombre_plan='Plan equilibrado'):
        plan = next(p for p in self.planes() if p['nombre'] == nombre_plan)
        return plan, plan['comidas'][0]

    # ── Primera visita ──
    def test_un_usuario_nuevo_entra_con_los_planes_principales(self):
        planes = self.planes()
        self.assertTrue(PRINCIPALES <= {p['nombre'] for p in planes})
        self.assertTrue(all(p['comidas'] for p in planes))

    def test_se_recomienda_el_plan_de_su_meta(self):
        recomendados = [p['nombre'] for p in self.planes() if p['recomendado']]
        self.assertEqual(recomendados, ['Plan alto en proteína'])

    def test_sin_meta_se_recomienda_el_equilibrado(self):
        Usuario.objects.filter(pk=self.usuario.pk).update(meta=None)
        recomendados = [p['nombre'] for p in self.planes() if p['recomendado']]
        self.assertEqual(recomendados, ['Plan equilibrado'])

    def test_un_plan_borrado_no_vuelve_solo_pero_se_puede_recuperar(self):
        plan, _ = self.comida_de('Plan mantenimiento')
        self.assertEqual(self.client.delete(f"/api/nutricion/planes/{plan['id']}/").status_code, 204)
        self.assertNotIn('Plan mantenimiento', {p['nombre'] for p in self.planes()})

        respuesta = self.client.post('/api/nutricion/planes/generar-catalogo/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertIn('Plan mantenimiento', {p['nombre'] for p in respuesta.data})

    # ── Registrar comidas ──
    def test_registrar_una_comida_calcula_segun_la_cantidad(self):
        _, comida = self.comida_de()
        respuesta = self.client.post('/api/nutricion/registros/', {'comida': comida['id'], 'cantidad_g': 150}, format='json')

        self.assertEqual(respuesta.status_code, 201)
        base = float(comida.get('cantidad_base_g') or 100)
        self.assertAlmostEqual(float(respuesta.data['calorias']), float(comida['calorias']) * 150 / base, delta=1)
        # La fecha es solo el día (antes, como DateTimeField, la respuesta daba 500)
        self.assertRegex(str(respuesta.data['fecha']), r'^\d{4}-\d{2}-\d{2}$')

        listado = self.client.get('/api/nutricion/registros/')
        self.assertEqual(listado.status_code, 200)
        self.assertEqual(len(listado.data), 1)

    def test_no_se_pueden_mandar_los_macros_a_mano(self):
        _, comida = self.comida_de()
        respuesta = self.client.post('/api/nutricion/registros/', {
            'comida': comida['id'], 'cantidad_g': 100, 'calorias': 1, 'grasas_g': 999,
        }, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertNotEqual(float(respuesta.data['calorias']), 1)
        self.assertNotEqual(float(respuesta.data['grasas_g']), 999)

    def test_cantidades_invalidas(self):
        _, comida = self.comida_de()
        for cantidad in (0, -5, 'abc', 20000):
            respuesta = self.client.post('/api/nutricion/registros/', {'comida': comida['id'], 'cantidad_g': cantidad}, format='json')
            self.assertEqual(respuesta.status_code, 400, cantidad)

    def test_borrar_un_plan_conserva_el_historial(self):
        plan, comida = self.comida_de()
        self.client.post('/api/nutricion/registros/', {'comida': comida['id'], 'cantidad_g': 100}, format='json')
        self.client.delete(f"/api/nutricion/planes/{plan['id']}/")

        self.assertEqual(RegistroComida.objects.filter(usuario=self.usuario).count(), 1)
        historial = self.client.get('/api/nutricion/registros/').data
        self.assertEqual(historial[0]['comida_nombre'], comida['nombre'])

    # ── Planes generados ──
    def test_plan_personalizado_y_modalidad_no_se_duplican(self):
        primero = self.client.post('/api/nutricion/planes/generar-personalizado/')
        segundo = self.client.post('/api/nutricion/planes/generar-personalizado/')
        self.assertEqual(primero.data['plan']['id'], segundo.data['plan']['id'])

        for _ in range(2):
            self.assertIn(self.client.post('/api/nutricion/planes/generar-modalidad/', {'nombre': 'Plan vegetariano'}, format='json').status_code, (200, 201))
        self.assertEqual(PlanNutricional.objects.filter(usuario=self.usuario, nombre='Plan vegetariano').count(), 1)

        inventada = self.client.post('/api/nutricion/planes/generar-modalidad/', {'nombre': 'Plan inventado'}, format='json')
        self.assertEqual(inventada.status_code, 400)

    # ── Datos de otros usuarios ──
    def test_no_se_puede_tocar_lo_de_otro_usuario(self):
        plan, comida = self.comida_de()
        registro = self.client.post('/api/nutricion/registros/', {'comida': comida['id'], 'cantidad_g': 100}, format='json').data

        otro, _ = crear_usuario('otro@test.com', 'otro')
        self.entrar(otro)
        self.assertEqual(self.client.get(f"/api/nutricion/planes/{plan['id']}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/nutricion/registros/{registro['id']}/").status_code, 404)
        usar = self.client.post('/api/nutricion/registros/', {'comida': comida['id'], 'cantidad_g': 100}, format='json')
        self.assertIn(usar.status_code, (400, 404))
