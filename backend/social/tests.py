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
        # Beto tiene la cuenta privada: las pruebas de solicitudes y visibilidad lo usan a él
        self.beto = crear_usuario('beto', 'Beto Ruiz')
        self.beto.cuenta_privada = True
        self.beto.save()
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


class InteraccionesTests(BaseSocialTest):
    def setUp(self):
        super().setUp()
        # beto publica; ana lo sigue (aceptado); caro no lo sigue
        self.entrar_como(self.beto)
        self.registro_id = self.client.post('/api/entrenamientos/registros/', ENTRENAMIENTO, format='json').data['id']
        Seguimiento.objects.create(seguidor=self.ana, seguido=self.beto, estado=Seguimiento.ACEPTADO)

    def url(self, ruta):
        return f'/api/social/registros/{self.registro_id}/{ruta}/'

    def test_dar_y_quitar_fuerza(self):
        self.entrar_como(self.ana)
        respuesta = self.client.post(self.url('fuerza'))
        self.assertEqual((respuesta.data['fuerzas'], respuesta.data['di_fuerza']), (1, True))
        # Dos veces no suma dos
        self.assertEqual(self.client.post(self.url('fuerza')).data['fuerzas'], 1)

        feed = self.client.get('/api/social/feed/').data['resultados'][0]
        self.assertEqual((feed['fuerzas'], feed['di_fuerza']), (1, True))

        self.assertEqual(self.client.delete(self.url('fuerza')).data['fuerzas'], 0)

    def test_comentar_listar_y_borrar(self):
        self.entrar_como(self.ana)
        creado = self.client.post(self.url('comentarios'), {'texto': '  ¡Buen volumen!  '}, format='json')
        self.assertEqual(creado.status_code, 201)
        self.assertEqual(creado.data['texto'], '¡Buen volumen!')
        self.assertEqual(creado.data['usuario']['username'], 'ana')

        self.assertEqual(self.client.get('/api/social/feed/').data['resultados'][0]['comentarios'], 1)
        self.assertEqual(len(self.client.get(self.url('comentarios')).data), 1)

        # El dueño del entrenamiento puede borrar comentarios ajenos; un tercero no
        self.entrar_como(self.caro)
        self.assertEqual(self.client.delete(f"/api/social/comentarios/{creado.data['id']}/").status_code, 404)
        self.entrar_como(self.beto)
        self.assertEqual(self.client.delete(f"/api/social/comentarios/{creado.data['id']}/").status_code, 204)

    def test_comentario_vacio(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.post(self.url('comentarios'), {'texto': '   '}, format='json').status_code, 400)

    def test_sin_seguir_no_se_puede_interactuar(self):
        self.entrar_como(self.caro)
        self.assertEqual(self.client.post(self.url('fuerza')).status_code, 404)
        self.assertEqual(self.client.get(self.url('comentarios')).status_code, 404)
        self.assertEqual(self.client.post(self.url('comentarios'), {'texto': 'hola'}, format='json').status_code, 404)

    def test_entrenamiento_oculto_no_admite_interacciones(self):
        self.entrar_como(self.beto)
        self.client.patch(f'/api/entrenamientos/registros/{self.registro_id}/', {'compartido': False}, format='json')
        self.entrar_como(self.ana)
        self.assertEqual(self.client.post(self.url('fuerza')).status_code, 404)


class SugerenciasTests(BaseSocialTest):
    def test_sugiere_amigos_de_amigos_primero_y_excluye_relacionados(self):
        dani = crear_usuario('dani')
        # ana sigue a beto; beto sigue a caro → caro es "amiga de amigo" de ana
        Seguimiento.objects.create(seguidor=self.ana, seguido=self.beto, estado=Seguimiento.ACEPTADO)
        Seguimiento.objects.create(seguidor=self.beto, seguido=self.caro, estado=Seguimiento.ACEPTADO)

        self.entrar_como(self.ana)
        nombres = [u['username'] for u in self.client.get('/api/social/sugerencias/').data]

        self.assertEqual(nombres[0], 'caro')
        self.assertIn(dani.username, nombres)
        self.assertNotIn('beto', nombres)  # ya la sigue
        self.assertNotIn('ana', nombres)


class CuentaPublicaTests(BaseSocialTest):
    """Caro tiene la cuenta pública (lo predeterminado)."""

    def setUp(self):
        super().setUp()
        self.entrar_como(self.caro)
        self.registro_id = self.client.post('/api/entrenamientos/registros/', ENTRENAMIENTO, format='json').data['id']

    def test_seguir_una_cuenta_publica_es_inmediato(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.post('/api/social/perfiles/caro/seguir/').data['estado'], 'aceptado')
        self.assertEqual(self.client.get('/api/social/feed/').data['resultados'][0]['id'], self.registro_id)
        self.assertEqual(self.client.get('/api/social/perfiles/caro/').data['relacion'], 'siguiendo')

    def test_cuenta_publica_se_ve_sin_seguirla(self):
        self.entrar_como(self.ana)
        perfil = self.client.get('/api/social/perfiles/caro/').data
        self.assertTrue(perfil['puede_ver'])
        self.assertFalse(perfil['cuenta_privada'])
        self.assertEqual(len(self.client.get('/api/social/perfiles/caro/entrenamientos/').data['resultados']), 1)
        # ...y se puede dar fuerza, pero no aparece en el feed porque no la sigue
        self.assertEqual(self.client.post(f'/api/social/registros/{self.registro_id}/fuerza/').status_code, 200)
        self.assertEqual(self.client.get('/api/social/feed/').data['resultados'], [])

    def test_entrenamiento_oculto_de_cuenta_publica_no_se_ve(self):
        self.client.patch(f'/api/entrenamientos/registros/{self.registro_id}/', {'compartido': False}, format='json')
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/social/perfiles/caro/entrenamientos/').data['resultados'], [])


class ConfiguracionTests(BaseSocialTest):
    def test_ver_y_editar_perfil(self):
        self.entrar_como(self.ana)
        datos = self.client.get('/api/usuarios/me/').data
        self.assertEqual((datos['username'], datos['email'], datos['cuenta_privada']), ('ana', 'ana@test.com', False))

        respuesta = self.client.patch('/api/usuarios/me/', {
            'nombre': ' Ana María ', 'username': '@Ana.Fit', 'peso': 62.5, 'altura': 1.68, 'meta': 'mantenerse',
        }, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.ana.refresh_from_db()
        self.assertEqual((self.ana.nombre, self.ana.username, self.ana.altura), ('Ana María', 'ana.fit', 1.68))

    def test_no_se_puede_usar_username_ajeno_pero_si_el_propio(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.patch('/api/usuarios/me/', {'username': 'beto'}, format='json').status_code, 400)
        self.assertEqual(self.client.patch('/api/usuarios/me/', {'username': 'ana'}, format='json').status_code, 200)

    def test_validaciones_de_peso_y_altura(self):
        self.entrar_como(self.ana)
        self.assertIn('altura', self.client.patch('/api/usuarios/me/', {'altura': 175}, format='json').data)
        self.assertIn('peso', self.client.patch('/api/usuarios/me/', {'peso': 5}, format='json').data)

    def test_hacer_publica_la_cuenta_acepta_las_solicitudes(self):
        self.entrar_como(self.ana)
        self.client.post('/api/social/perfiles/beto/seguir/')  # beto es privado → pendiente
        self.entrar_como(self.beto)
        self.client.patch('/api/usuarios/me/', {'cuenta_privada': False}, format='json')
        self.assertEqual(Seguimiento.objects.get().estado, Seguimiento.ACEPTADO)

    def test_compartir_por_defecto(self):
        self.entrar_como(self.ana)
        self.client.patch('/api/usuarios/me/', {'compartir_por_defecto': False}, format='json')
        creado = self.client.post('/api/entrenamientos/registros/', ENTRENAMIENTO, format='json').data
        self.assertFalse(creado['compartido'])
        # Si el entrenamiento lo indica, manda lo que diga
        creado = self.client.post('/api/entrenamientos/registros/', {**ENTRENAMIENTO, 'compartido': True}, format='json').data
        self.assertTrue(creado['compartido'])

    def test_cambiar_password(self):
        self.entrar_como(self.ana)
        mala = self.client.post('/api/usuarios/me/password/', {'actual': 'otra', 'nueva': 'Nueva12345'}, format='json')
        self.assertEqual(mala.status_code, 400)
        buena = self.client.post('/api/usuarios/me/password/', {'actual': 'Clave12345', 'nueva': 'Nueva12345'}, format='json')
        self.assertEqual(buena.status_code, 200)
        self.ana.auth.refresh_from_db()
        self.assertTrue(self.ana.auth.check_password('Nueva12345'))

    def test_eliminar_cuenta_pide_la_contrasena(self):
        self.entrar_como(self.ana)
        self.assertEqual(self.client.delete('/api/usuarios/me/', {'password': 'mal'}, format='json').status_code, 400)
        self.assertEqual(self.client.delete('/api/usuarios/me/', {'password': 'Clave12345'}, format='json').status_code, 204)
        self.assertFalse(Usuario.objects.filter(username='ana').exists())


class NotificacionesTests(BaseSocialTest):
    def publicar_como(self, usuario, **extra):
        self.entrar_como(usuario)
        self.client.post('/api/entrenamientos/registros/', {**ENTRENAMIENTO, **extra}, format='json')
        return RegistroEntrenamiento.objects.filter(usuario=usuario).latest('id')

    def avisos(self, usuario):
        self.entrar_como(usuario)
        return self.client.get('/api/social/notificaciones/').data

    def test_seguir_cuenta_publica_avisa_y_privada_avisa_solicitud(self):
        self.entrar_como(self.caro)
        self.client.post('/api/social/perfiles/ana/seguir/')
        self.client.post('/api/social/perfiles/beto/seguir/')
        self.assertEqual([n['tipo'] for n in self.avisos(self.ana)['resultados']], ['seguidor'])
        self.assertEqual([n['tipo'] for n in self.avisos(self.beto)['resultados']], ['solicitud'])

    def test_aceptar_solicitud_avisa_a_quien_la_pidio(self):
        self.entrar_como(self.caro)
        self.client.post('/api/social/perfiles/beto/seguir/')
        solicitud = Seguimiento.objects.get(seguidor=self.caro, seguido=self.beto)
        self.entrar_como(self.beto)
        self.client.post(f'/api/social/solicitudes/{solicitud.id}/')
        avisos = self.avisos(self.caro)['resultados']
        self.assertEqual(avisos[0]['tipo'], 'solicitud_aceptada')
        self.assertEqual(avisos[0]['actor']['username'], 'beto')

    def test_fuerza_y_comentario_avisan_al_dueno_y_quitar_fuerza_borra_el_aviso(self):
        registro = self.publicar_como(self.ana)
        self.entrar_como(self.caro)
        self.client.post(f'/api/social/registros/{registro.id}/fuerza/')
        self.client.post(f'/api/social/registros/{registro.id}/comentarios/', {'texto': '¡Bien!'}, format='json')
        datos = self.avisos(self.ana)
        self.assertEqual(datos['no_leidas'], 2)
        self.assertEqual({n['tipo'] for n in datos['resultados']}, {'fuerza', 'comentario'})

        self.entrar_como(self.caro)
        self.client.delete(f'/api/social/registros/{registro.id}/fuerza/')
        self.assertEqual([n['tipo'] for n in self.avisos(self.ana)['resultados']], ['comentario'])

    def test_lo_que_hago_en_lo_mio_no_me_avisa(self):
        registro = self.publicar_como(self.ana)
        self.client.post(f'/api/social/registros/{registro.id}/fuerza/')
        self.client.post(f'/api/social/registros/{registro.id}/comentarios/', {'texto': 'yo'}, format='json')
        self.assertEqual(self.avisos(self.ana)['resultados'], [])

    def test_marcar_como_leidas_y_contador(self):
        self.entrar_como(self.caro)
        self.client.post('/api/social/perfiles/ana/seguir/')
        self.entrar_como(self.ana)
        self.assertEqual(self.client.get('/api/social/notificaciones/contador/').data['no_leidas'], 1)
        self.client.post('/api/social/notificaciones/')
        self.assertEqual(self.client.get('/api/social/notificaciones/contador/').data['no_leidas'], 0)

    def test_mencion_avisa_solo_a_quien_puede_ver_el_entrenamiento(self):
        registro = self.publicar_como(self.ana)  # Ana es pública
        self.entrar_como(self.caro)
        texto = 'Mira esto @beto y @ana, ojo @noexiste'
        self.client.post(f'/api/social/registros/{registro.id}/comentarios/', {'texto': texto}, format='json')
        # Beto puede ver a Ana (cuenta pública) → mención; Ana ya recibe "comentario", sin doble aviso
        self.assertEqual([n['tipo'] for n in self.avisos(self.beto)['resultados']], ['mencion'])
        self.assertEqual([n['tipo'] for n in self.avisos(self.ana)['resultados']], ['comentario'])

        # En un entrenamiento de Beto (privado), mencionar a Ana no le avisa: no puede verlo
        registro_beto = self.publicar_como(self.beto)
        self.client.post(f'/api/social/registros/{registro_beto.id}/comentarios/', {'texto': 'hola @ana'}, format='json')
        self.assertNotIn('mencion', [n['tipo'] for n in self.avisos(self.ana)['resultados']])


class ClasificacionYCompararTests(BaseSocialTest):
    def publicar_como(self, usuario, **extra):
        self.entrar_como(usuario)
        self.client.post('/api/entrenamientos/registros/', {**ENTRENAMIENTO, **extra}, format='json')

    def test_clasificacion_incluye_a_mi_y_a_quien_sigo_ordenada(self):
        self.publicar_como(self.ana)
        self.publicar_como(self.ana)
        self.publicar_como(self.caro)
        self.publicar_como(self.caro, nombre='Oculto', compartido=False)  # no cuenta para los demás
        self.entrar_como(self.caro)
        self.client.post('/api/social/perfiles/ana/seguir/')

        filas = self.client.get('/api/social/clasificacion/').data['resultados']
        self.assertEqual([(f['usuario']['username'], f['entrenamientos']) for f in filas], [('ana', 2), ('caro', 2)])
        self.assertTrue(filas[1]['soy_yo'])
        self.assertEqual(filas[0]['posicion'], 1)

        # Beto no sigue a nadie: solo se ve él
        self.entrar_como(self.beto)
        filas = self.client.get('/api/social/clasificacion/').data['resultados']
        self.assertEqual([f['usuario']['username'] for f in filas], ['beto'])

    def test_comparar_totales_y_ejercicios_en_comun(self):
        self.publicar_como(self.ana)
        self.publicar_como(self.caro)
        self.entrar_como(self.caro)
        datos = self.client.get('/api/social/perfiles/ana/comparar/').data
        self.assertEqual(datos['yo']['entrenamientos'], 1)
        self.assertEqual(datos['otro']['entrenamientos'], 1)
        self.assertEqual(datos['ejercicios_en_comun'][0]['nombre'], 'Sentadilla')
        self.assertEqual(datos['ejercicios_en_comun'][0]['otro'], 70)

    def test_comparar_cuenta_privada_sin_seguir_no_se_puede(self):
        self.entrar_como(self.caro)
        self.assertEqual(self.client.get('/api/social/perfiles/beto/comparar/').status_code, 403)

    def test_insignias_en_el_perfil(self):
        self.publicar_como(self.ana)
        self.entrar_como(self.caro)
        insignias = self.client.get('/api/social/perfiles/ana/').data['insignias']
        self.assertIn('primer', [i['id'] for i in insignias])
        self.assertNotIn('peso', [i['id'] for i in insignias])
