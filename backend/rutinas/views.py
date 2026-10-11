from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models.functions import Lower
from .models import Rutina, RutinaEjercicio
from users.models import Usuario, Ejercicio as EjercicioBiblioteca
from .serializers import (
    EjercicioSerializer,
    RutinaSerializer,
    RutinaEjercicioSerializer,
)

# ============================================================
# EJERCICIOS
# ============================================================

class EjercicioListView(APIView):
    def get(self, request):
        grupo = request.query_params.get("grupo")
        ejercicios = EjercicioBiblioteca.objects.all().order_by("nombre")

        if grupo:
            ejercicios = ejercicios.annotate(
                grupo_normalizado=Lower("grupo")
            ).filter(grupo_normalizado=grupo.lower())

        serializer = EjercicioSerializer(ejercicios, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = EjercicioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EjercicioDetailView(APIView):

    def get_object(self, pk):
        try:
            return EjercicioBiblioteca.objects.get(pk=pk)
        except EjercicioBiblioteca.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_object(pk)

        if not obj:
            return Response(
                {'error': 'No encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            EjercicioSerializer(obj).data
        )

    def put(self, request, pk):
        obj = self.get_object(pk)

        if not obj:
            return Response(
                {'error': 'No encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = EjercicioSerializer(
            obj,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        obj = self.get_object(pk)

        if not obj:
            return Response(
                {'error': 'No encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        obj.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# RUTINAS
# ============================================================

class RutinaListView(APIView):

    def get(self, request, usuario_id):

        try:
            usuario = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        rutinas = (
            Rutina.objects
            .filter(usuario=usuario)
            .prefetch_related('rutinaejercicio_set__ejercicio')
            .order_by('-created_at')
        )

        datos = RutinaSerializer(rutinas, many=True).data
        _marcar_recomendadas(datos, usuario)

        return Response(datos)

    def post(self, request, usuario_id):

        try:
            usuario = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RutinaSerializer(
            data=request.data
        )

        if serializer.is_valid():

            serializer.save(
                usuario=usuario
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class RutinaDetailView(APIView):

    def get_object(self, pk):

        try:
            return Rutina.objects.get(pk=pk)
        except Rutina.DoesNotExist:
            return None

    def get(self, request, usuario_id, pk):

        obj = self.get_object(pk)

        if not obj:
            return Response(
                {'error': 'No encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(
            RutinaSerializer(obj).data
        )

    def put(self, request, usuario_id, pk):

        obj = self.get_object(pk)

        if not obj:
            return Response(
                {'error': 'No encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RutinaSerializer(
            obj,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, usuario_id, pk):

        obj = self.get_object(pk)

        if not obj:
            return Response(
                {'error': 'No encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        obj.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# RUTINA FAVORITA
# ============================================================

class RutinaFavoritaView(APIView):

    def patch(self, request, usuario_id, pk):

        try:
            rutina = Rutina.objects.get(
                pk=pk,
                usuario_id=usuario_id
            )
        except Rutina.DoesNotExist:

            return Response(
                {'error': 'No encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        rutina.es_favorita = not rutina.es_favorita

        rutina.save(
            update_fields=['es_favorita']
        )

        return Response({
            'es_favorita': rutina.es_favorita
        })


# ============================================================
# AGREGAR EJERCICIO A UNA RUTINA
# ============================================================

class AgregarEjercicioRutinaView(APIView):

    def post(self, request, usuario_id, pk):

        try:
            rutina = Rutina.objects.get(
                pk=pk,
                usuario_id=usuario_id
            )
        except Rutina.DoesNotExist:

            return Response(
                {'error': 'Rutina no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RutinaEjercicioSerializer(
            data=request.data
        )

        if serializer.is_valid():

            orden = serializer.validated_data.get(
                'orden',
                rutina.rutinaejercicio_set.count()
            )

            objeto = serializer.save(
                rutina=rutina,
                orden=orden
            )

            return Response(
                RutinaEjercicioSerializer(objeto).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


# ============================================================
# EDITAR / ELIMINAR EJERCICIO DE RUTINA
# ============================================================

class RutinaEjercicioDetailView(APIView):

    def get_object(
        self,
        usuario_id,
        rutina_id,
        pk
    ):

        try:
            return RutinaEjercicio.objects.get(
                pk=pk,
                rutina_id=rutina_id,
                rutina__usuario_id=usuario_id
            )
        except RutinaEjercicio.DoesNotExist:
            return None

    def patch(
        self,
        request,
        usuario_id,
        rutina_id,
        pk
    ):

        obj = self.get_object(
            usuario_id,
            rutina_id,
            pk
        )

        if not obj:
            return Response(
                {
                    'error':
                    'Ejercicio de rutina no encontrado'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RutinaEjercicioSerializer(
            obj,
            data=request.data,
            partial=True
        )

        if serializer.is_valid():

            serializer.save()

            return Response(
                RutinaEjercicioSerializer(obj).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(
        self,
        request,
        usuario_id,
        rutina_id,
        pk
    ):

        obj = self.get_object(
            usuario_id,
            rutina_id,
            pk
        )

        if not obj:
            return Response(
                {
                    'error':
                    'Ejercicio de rutina no encontrado'
                },
                status=status.HTTP_404_NOT_FOUND
            )

        obj.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


# ============================================================
# CATÁLOGO DE RUTINAS BASE
# ============================================================

# A qué rutina base corresponde cada meta del usuario. Se usa solo
# para marcar "recomendada" en la lista; no cambia lo que ya existe.
META_A_RUTINA_BASE = {
    'perder_peso': 'Pérdida de peso',
    'ganar_musculo': 'Ganancia muscular',
    'mantenerse': 'Tonificación',
    'mejorar_resistencia': 'Cardio',
}


def _marcar_recomendadas(datos_rutinas, usuario):
    """Añade 'recomendada': True a la rutina que mejor se ajusta a la
    meta del usuario, sin tocar la base de datos."""
    nombre_recomendada = META_A_RUTINA_BASE.get(usuario.meta)
    for rutina in datos_rutinas:
        rutina['recomendada'] = rutina.get('nombre') == nombre_recomendada
    return datos_rutinas



RUTINAS_BASE = [
    {
        'nombre': 'Cuerpo completo',
        'descripcion': 'Entrenamiento equilibrado para trabajar todo el cuerpo.',
        'series': 3,
        'repeticiones': 10,
        'descanso': 60,
        'grupos': [
            ('upper_legs', 1),
            ('legs', 1),
            ('chest', 1),
            ('back', 1),
            ('shoulders', 1),
            ('abs', 1),
        ],
    },
    {
        'nombre': 'Tren superior',
        'descripcion': 'Rutina enfocada en pecho, espalda, hombros y brazos.',
        'series': 3,
        'repeticiones': 10,
        'descanso': 75,
        'grupos': [
            ('chest', 2),
            ('back', 2),
            ('shoulders', 1),
            ('upper_arms', 1),
        ],
    },
    {
        'nombre': 'Tren inferior',
        'descripcion': 'Entrenamiento enfocado en piernas y zona inferior.',
        'series': 3,
        'repeticiones': 10,
        'descanso': 75,
        'grupos': [
            ('upper_legs', 2),
            ('legs', 2),
            ('calves', 1),
            ('abs', 1),
        ],
    },
    {
        'nombre': 'Glúteos y piernas',
        'descripcion': 'Rutina enfocada en glúteos, piernas y pantorrillas.',
        'series': 3,
        'repeticiones': 12,
        'descanso': 60,
        'grupos': [('glutes', 2), ('upper_legs', 2), ('calves', 1), ('abs', 1)]
    },
    {
        'nombre': 'Cardio',
        'descripcion': 'Entrenamiento cardiovascular y de resistencia.',
        'series': 3,
        'repeticiones': 12,
        'descanso': 45,
        'grupos': [
            ('cardio', 4),
            ('full_body', 1),
            ('abs', 1),
        ],
    },
    {
        'nombre': 'Tonificación',
        'descripcion': 'Rutina equilibrada para trabajar diferentes grupos musculares.',
        'series': 3,
        'repeticiones': 12,
        'descanso': 60,
        'grupos': [
            ('chest', 1),
            ('back', 1),
            ('shoulders', 1),
            ('upper_arms', 1),
            ('legs', 1),
            ('abs', 1),
        ],
    },
    {
        'nombre': 'Ganancia muscular',
        'descripcion': 'Rutina enfocada en fuerza e hipertrofia muscular.',
        'series': 3,
        'repeticiones': 10,
        'descanso': 90,
        'grupos': [
            ('chest', 1),
            ('back', 1),
            ('shoulders', 1),
            ('upper_arms', 1),
            ('upper_legs', 1),
            ('legs', 1),
        ],
    },
    {
        'nombre': 'Pérdida de peso',
        'descripcion': 'Entrenamiento combinado para favorecer el gasto energético.',
        'series': 3,
        'repeticiones': 12,
        'descanso': 45,
        'grupos': [
            ('cardio', 3),
            ('full_body', 2),
            ('abs', 1),
        ],
    },
]



# ============================================================
# GENERAR CATÁLOGO DE RUTINAS PARA UN USUARIO
# ============================================================


MUSCULOS_POR_GRUPO = {
    'chest': {
        'chest', 'pectoralis_major', 'pectoralis_minor',
    },
    'back': {
        'lats', 'latissimus_dorsi', 'rhomboids',
        'trapezius', 'erector_spinae',
    },
    'shoulders': {
        'shoulders', 'deltoid', 'anterior_deltoid',
        'lateral_deltoid', 'posterior_deltoid',
    },
    'upper_arms': {
        'biceps', 'biceps_brachii', 'triceps',
        'triceps_brachii', 'brachialis',
    },
    'upper_legs': {
        'quads', 'quadriceps', 'hamstrings',
        'hip_flexors', 'adductors',
    },
    'legs': {
        'quads', 'quadriceps', 'hamstrings',
        'calves', 'gastrocnemius', 'soleus',
    },
    'calves': {
        'calves', 'gastrocnemius', 'soleus',
    },
    'abs': {
        'abs', 'core', 'rectus_abdominis',
        'obliquus_externus_abdominis', 'obliques',
        'transverse_abdominis',
    },
    'glutes': {
        'glutes', 'gluteus_maximus',
        'gluteus_medius', 'gluteus_minimus',
    },
}



def _normalizar_musculos(musculos):
    return {
        str(musculo).strip().casefold().replace(' ', '_')
        for musculo in (musculos or [])
    }





def _patron_movimiento(ejercicio, grupo):
    nombre = (ejercicio.nombre or '').casefold()
    grupo = grupo.casefold()

    # ESPALDA
    if grupo == 'back':
        if any(p in nombre for p in (
            'pull down', 'pulldown', 'pull-up', 'pull up',
            'chin up', 'front pull', 'dominada', 'jal',
        )):
            return 'traccion_vertical'

        if any(p in nombre for p in ('remo', 'row', 'rowing')):
            return 'traccion_horizontal'

        if any(p in nombre for p in (
            'deadlift', 'peso muerto', 'levantamento terra',
            'back extension', 'hip extension',
        )):
            return 'extension_espalda_cadera'

    # PECHO
    if grupo == 'chest':
        if any(p in nombre for p in (
            'fly', 'butterfly', 'crossover', 'apertura',
            'pec deck',
        )):
            return 'apertura'

        if any(p in nombre for p in (
            'press', 'bench', 'supino', 'push-up',
            'push up', 'pushup', 'flexion', 'flexão',
        )):
            return 'empuje'

    # PIERNAS Y GLÚTEOS
    if grupo in ('legs', 'upper_legs', 'glutes'):
        if any(p in nombre for p in (
            'hip thrust', 'glute bridge', 'puente de gluteos',
            'glute kickback', 'kickback', 'patada de gluteo',
        )):
            return 'extension_gluteo'

        if any(p in nombre for p in (
            'deadlift', 'peso muerto', 'romanian deadlift',
            'good morning', 'pull through',
        )):
            return 'bisagra_cadera'

        if any(p in nombre for p in (
            'squat', 'sentadilla', 'leg press',
            'prensa de piernas', 'hack squat',
        )):
            return 'sentadilla'

        if any(p in nombre for p in (
            'lunge', 'zancada', 'split squat',
            'bulgarian split', 'step-up', 'step up',
        )):
            return 'unilateral_pierna'

        if any(p in nombre for p in (
            'leg extension', 'extension de cuadriceps',
        )):
            return 'extension_cuadriceps'

        if any(p in nombre for p in (
            'leg curl', 'hamstring curl',
            'curl femoral', 'seated leg curl',
        )):
            return 'curl_femoral'

        if any(p in nombre for p in (
            'calf raise', 'calf press', 'pantorrilla',
            'gemelo',
        )):
            return 'pantorrilla'

        if any(p in nombre for p in (
            'hip abduction', 'abduccion de cadera',
            'hip adduction', 'adduccion de cadera',
        )):
            return 'abduccion_adduccion_cadera'

    # HOMBROS
    if grupo == 'shoulders':
        if any(p in nombre for p in (
            'lateral raise', 'elevacion lateral',
            'elevación lateral', 'side raise',
        )):
            return 'elevacion_lateral'

        if any(p in nombre for p in (
            'rear delt', 'reverse fly', 'face pull',
            'posterior deltoid', 'pajaro', 'pájaro',
        )):
            return 'deltoide_posterior'

        if any(p in nombre for p in (
            'overhead press', 'shoulder press',
            'military press', 'press militar',
            'elevacion frontal', 'front raise',
        )):
            return 'empuje_hombro'

    # BRAZOS
    if grupo == 'upper_arms':
        if any(p in nombre for p in (
            'curl', 'biceps', 'bíceps', 'bicep',
        )):
            return 'flexion_codo'

        if any(p in nombre for p in (
            'triceps', 'tríceps', 'tricep',
            'pushdown', 'push down', 'pressdown',
            'skull crusher', 'extension de triceps',
        )):
            return 'extension_codo'

    # ABDOMEN
    if grupo == 'abs':
        if any(p in nombre for p in (
            'plank', 'plancha', 'stabilization',
            'stabilisation',
        )):
            return 'estabilidad_core'

        if any(p in nombre for p in (
            'crunch', 'sit-up', 'sit up', 'situp',
            'abdominal', 'leg raise',
        )):
            return 'flexion_abdominal'

        if any(p in nombre for p in (
            'woodchop', 'wood chop', 'russian twist',
            'oblique', 'rotacion de tronco',
        )):
            return 'rotacion_core'

    return 'otro'



def _seleccionar_ejercicios(grupo, cantidad, seleccionados):
    grupo_objetivo = grupo.casefold()
    musculos_objetivo = MUSCULOS_POR_GRUPO.get(
        grupo_objetivo, set()
    )

    candidatos = []

    for ejercicio in EjercicioBiblioteca.objects.all().order_by('id'):

        nombre = (ejercicio.nombre or '').casefold()

        if grupo_objetivo == 'chest' and 'wiper' in nombre:
            continue

        if grupo_objetivo == 'back' and any(
            palabra in nombre
            for palabra in (
                'flexões de braço',
                'push-up',
                'push up',
                'pushup',
                'wall push',
            )
        ):
            continue       

        if ejercicio.id in seleccionados:
            continue

        principales = _normalizar_musculos(
            ejercicio.musculos_principales
        )
        secundarios = _normalizar_musculos(
            ejercicio.musculos_secundarios
        )
        grupo_ejercicio = (ejercicio.grupo or '').strip().casefold()

        if grupo_objetivo == 'cardio':
            if grupo_ejercicio != 'cardio':
                continue
            puntuacion = 10

        elif grupo_objetivo == 'full_body':
            if grupo_ejercicio != 'full_body':
                continue
            puntuacion = 10 + min(len(principales), 5)

        else:
            principales_coincidentes = (
                principales & musculos_objetivo
            )
            secundarios_coincidentes = (
                secundarios & musculos_objetivo
            )

            if not principales_coincidentes and not secundarios_coincidentes:
                continue

            puntuacion = 0

            if principales_coincidentes:
                puntuacion += 10 + 2 * (
                    len(principales_coincidentes) - 1
                )

            puntuacion += 3 * len(secundarios_coincidentes)

            if grupo_ejercicio == grupo_objetivo:
                puntuacion += 4

            puntuacion -= min(
                len(principales - musculos_objetivo), 4
            )

        patron = _patron_movimiento(ejercicio, grupo_objetivo)
        candidatos.append((puntuacion, ejercicio.id, ejercicio, patron))

    candidatos.sort(key=lambda item: (-item[0], item[1]))

    elegidos = []
    patrones_usados = set()

    while candidatos and len(elegidos) < cantidad:
        mejor_puntuacion = candidatos[0][0]

        # Prioriza otro patrón si su puntuación es suficientemente cercana.
        opciones_variedad = [
            item for item in candidatos
            if item[0] >= mejor_puntuacion - 6
            and item[3] not in patrones_usados
        ]

        elegido = opciones_variedad[0] if opciones_variedad else candidatos[0]

        elegidos.append(elegido[2])
        seleccionados.add(elegido[1])
        patrones_usados.add(elegido[3])
        candidatos.remove(elegido)

    return elegidos



class GenerarCatalogoRutinasView(APIView):

    @transaction.atomic
    def post(self, request):
        usuario_id = request.data.get('usuario_id')

        if not usuario_id:
            return Response(
                {'error': 'Debes enviar usuario_id.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = get_object_or_404(Usuario, pk=usuario_id)

        for configuracion in RUTINAS_BASE:
            nombre = configuracion['nombre']

            rutina, creada = Rutina.objects.get_or_create(
                usuario=usuario,
                nombre=nombre,
                defaults={
                    'descripcion': configuracion['descripcion'],
                    'es_favorita': False,
                }
            )

            if creada or not rutina.rutinaejercicio_set.exists():
                if not creada:
                    rutina.rutinaejercicio_set.all().delete()

                orden = 1
                seleccionados = set()

                for grupo, cantidad in configuracion['grupos']:
                    ejercicios = _seleccionar_ejercicios(
                        grupo,
                        cantidad,
                        seleccionados,
                    )

                    for ejercicio in ejercicios:
                        RutinaEjercicio.objects.create(
                            rutina=rutina,
                            ejercicio=ejercicio,
                            series=configuracion['series'],
                            repeticiones=configuracion['repeticiones'],
                            descanso_segundos=configuracion['descanso'],
                            orden=orden,
                        )
                        orden += 1

        rutinas = (
            Rutina.objects
            .filter(
                usuario=usuario,
                nombre__in=[r['nombre'] for r in RUTINAS_BASE]
            )
            .prefetch_related('rutinaejercicio_set__ejercicio')
            .order_by('id')
        )

        return Response(
            {
                'mensaje': 'Catálogo de rutinas generado correctamente.',
                'rutinas': _marcar_recomendadas(
                    RutinaSerializer(rutinas, many=True).data,
                    usuario,
                ),
                'total': rutinas.count(),
            },
            status=status.HTTP_201_CREATED
        )