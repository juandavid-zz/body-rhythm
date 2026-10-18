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


def _patron_movimiento(ejercicio, grupo):
    nombre = _normalizar_valor(ejercicio.nombre)
    grupo = _normalizar_valor(grupo)

    # PANTORRILLAS
    if grupo == "calves":
        if any(p in nombre for p in (
            "calf_raise", "calf_raises", "calf_press",
            "calf_machine", "pantorrilla", "panturrilha",
            "gemelo", "elevacao_da_panturrilha",
            "tibialis_raise",
        )):
            return "pantorrilla"
        return "otro"

    # ESPALDA
    if grupo == "back":
        if any(p in nombre for p in (
            "pulldown", "pull_down", "pull_up", "chin_up",
            "dominada", "jalon",
        )):
            return "traccion_vertical"

        if any(p in nombre for p in ("remo", "row", "rowing")):
            return "traccion_horizontal"

        if any(p in nombre for p in (
            "deadlift", "peso_muerto", "levantamento_terra",
            "back_extension", "hip_extension",
        )):
            return "extension_espalda_cadera"

    # PECHO
    if grupo == "chest":
        if any(p in nombre for p in (
            "fly", "butterfly", "crossover", "apertura", "pec_deck",
        )):
            return "apertura"

        if any(p in nombre for p in (
            "press", "bench", "supino", "push_up", "pushup",
            "flexion", "flexao",
        )):
            return "empuje"

    # PIERNAS Y GLÚTEOS
    if grupo in ("legs", "upper_legs", "glutes"):
        if any(p in nombre for p in (
            "hip_thrust", "glute_bridge", "glute_bridges",
            "glute_kickback", "kickback", "puente_de_gluteo",
            "puente_de_gluteos", "empuje_de_cadera",
        )):
            return "extension_gluteo"

        if any(p in nombre for p in (
            "leg_extension", "knee_extension",
            "extension_de_pierna", "extension_de_cuadriceps",
            "extensao_de_pernas",
        )):
            return "extension_cuadriceps"


        if any(p in nombre for p in (
            "leg_curl", "hamstring_curl", "nordic_curl",
            "curl_femoral", "curl_de_isquiotibiales",
            "curl_de_pierna", "curl_de_piernas",
            "flexao_de_pernas",
        )):
            return "curl_femoral"


        if any(p in nombre for p in (
            "deadlift", "romanian_deadlift", "rdl",
            "peso_muerto", "buenos_dias", "good_morning",
            "levantamento_terra",
        )):
            return "bisagra_cadera"

        if any(p in nombre for p in (
            "squat", "sentadilla", "agachamento",
        )):
            return "sentadilla"

        if any(p in nombre for p in (
            "lunge", "zancada", "zancadas",
            "bulgarian_split_squat",
        )):
            return "unilateral_pierna"

        if any(p in nombre for p in (
            "hip_abduction", "abduccion_de_cadera",
            "hip_adduction", "adduccion_de_cadera",
        )):
            return "abduccion_adduccion_cadera"

    # HOMBROS
    if grupo == "shoulders":
        if any(p in nombre for p in (
            "lateral_raise", "elevacion_lateral", "side_raise",
        )):
            return "elevacion_lateral"

        if any(p in nombre for p in (
            "rear_delt", "reverse_fly", "face_pull",
            "posterior_deltoid", "pajaro",
        )):
            return "deltoide_posterior"

        if any(p in nombre for p in (
            "overhead_press", "shoulder_press", "military_press",
            "press_militar",
        )):
            return "empuje_hombro"

    # BRAZOS
    if grupo == "upper_arms":
        if any(p in nombre for p in ("curl", "biceps", "bicep")):
            return "flexion_codo"

        if any(p in nombre for p in (
            "triceps", "tricep", "pushdown", "push_down",
            "pressdown", "skull_crusher", "extension_de_triceps",
        )):
            return "extension_codo"

    # ABDOMEN
    if grupo == "abs":
        if any(p in nombre for p in (
            "plank", "plancha", "stabilization", "stabilisation",
        )):
            return "estabilidad_core"

        if any(p in nombre for p in (
            "crunch", "sit_up", "situp", "abdominal", "leg_raise",
        )):
            return "flexion_abdominal"

        if any(p in nombre for p in (
            "woodchop", "wood_chop", "russian_twist",
            "oblique", "rotacion_de_tronco",
        )):
            return "rotacion_core"

    return "otro"




EJERCICIOS_BASE_POR_GRUPO = {
    "chest": [
        "Bench Press", "Butterfly", "Aperturas con Mancuernas",
        "Aperturas con Cable",
        "Apertura con mancuernas en banco inclinado",
        "Cable Chest Press - Incline", "Cable Chest Press - Decline",
    ],
    "back": [
        "Bent Over Dumbbell Rows", "Assisted Pull-Up",
        "Barbell Row (Overhand)",
        "Close-grip supinated lat pulldown",
        "1-Arm Half-Kneeling Lat Pulldown",
    ],
    "shoulders": [
        "Arnold Shoulder Press", "Lateral Raises",
        "Elevación Lateral con Mancuernas",
        "Elevación Lateral con Mancuerna Sentado",
        "Elevación Lateral en Polea",
    ],
    "upper_arms": [
        "Biceps Curls With Dumbbell", "Barbell Triceps Extension",
        "Biceps Curl Machine", "Biceps Curl With Cable",
        "Alternating dumbbell hammer curl",
    ],
    "upper_legs": [
        "Leg Extension", "Leg Curl",
        "Dumbbell Romanian Deadlift", "Romanian Deadlift",
        "Barbell Lunges Walking", "Peso Muerto Rumano",
        "Sentadilla con Peso Corporal", "Sentadilla Goblet",
        "Bodyweight Squat HD", "Barbell Full Squat",
        "Dumbbell Goblet Squat", "Leg Press", "Prensa de Piernas",
    ],
    "legs": [
        "Barbell Full Squat", "Bodyweight lunge HD",
        "Dumbbell Goblet Squat", "Leg Press",
        "Barbell Hack Squats", "Leg Extension", "Leg Curl",
        "Dumbbell Romanian Deadlift", "Romanian Deadlift",
        "Bodyweight Squat HD", "Sentadilla con Peso Corporal",
        "Sentadilla Goblet", "Prensa de Piernas", "Peso Muerto Rumano",
    ],
    "glutes": [
        "Glute Bridge", "Hip Thrust", "Dumbbell Hip Thrust",
        "Cable glute extension", "Glute Kickback (Machine)",
        "Puente de Glúteos", "Sentadilla con Peso Corporal",
        "Sentadilla Goblet", "Sentadilla Trasera con Barra",
    ],
    "calves": [
        "Standing Calf Raises", "Sitting Calf Raises",
        "Seated Dumbbell Calf Raise", "Double Leg Calf Raise",
        "Calf Raises on Hackenschmitt Machine",
        "Calf Press Using Leg Press Machine",
    ],
    "abs": ["Abdominal Crunch"],
    "cardio": [
        "Caminata Rápida", "Corda de Salto: saltos básicos",
        "Jumping Jack HD", "Cycling", "Walking", "Elliptical",
        "Recumbent Bike", "March or jog in place",
        "Skipping - Standard", "Polichinelos", "Saltar la Cuerda",
    ],
    "full_body": [
        "Cuerdas de Batalla", "Bicicleta de Aire",
        "Burpees", "Caminata del Granjero con Mancuernas",
    ],
}



def _normalizar_valor(valor):
    import unicodedata

    valor = str(valor or "").strip().casefold()
    valor = unicodedata.normalize("NFKD", valor)
    valor = "".join(
        caracter for caracter in valor
        if not unicodedata.combining(caracter)
    )
    return valor.replace(" ", "_").replace("-", "_")




GRUPOS_COMPATIBLES = {
    "chest": {"chest"},
    "back": {"back"},
    "shoulders": {"shoulders"},
    "upper_arms": {"arms", "upper_arms"},
    "upper_legs": {"legs", "upper_legs"},
    "legs": {"legs", "upper_legs"},
    "glutes": {"legs", "upper_legs"},
    "calves": {"calves", "lower_legs"},
    "abs": {"abs", "core"},
    "cardio": {"cardio"},
    "full_body": {"full_body"},
}


# Unifica las distintas formas en que la biblioteca registra músculos.
ALIAS_MUSCULOS = {
    "pectoralis_major": "chest",
    "pectoralis_minor": "chest",
    "latissimus_dorsi": "lats",
    "rhomboids": "back",
    "erector_spinae": "back",
    "trapezius": "trapezius",
    "anterior_deltoid": "shoulders",
    "lateral_deltoid": "shoulders",
    "posterior_deltoid": "shoulders",
    "biceps_brachii": "biceps",
    "triceps_brachii": "triceps",
    "brachialis": "brachialis",
    "quadriceps": "quads",
    "gluteus_maximus": "glutes",
    "gluteus_medius": "glutes",
    "gluteus_minimus": "glutes",
    "gastrocnemius": "calves",
    "soleus": "calves",
    "rectus_abdominis": "abs",
    "transverse_abdominis": "abs",
    "obliquus_externus_abdominis": "obliques",
}


def _musculos_canonicos(musculos):
    resultado = set()

    for musculo in musculos or []:
        normalizado = _normalizar_valor(musculo)
        canonico = ALIAS_MUSCULOS.get(normalizado, normalizado)
        resultado.add(canonico)

    return resultado


def _seleccionar_ejercicios(grupo, cantidad, seleccionados):
    if cantidad <= 0:
        return []

    grupo_objetivo = _normalizar_valor(grupo)
    grupos_validos = GRUPOS_COMPATIBLES.get(
        grupo_objetivo, {grupo_objetivo}
    )

    # Los patrones ayudan a distinguir movimientos específicos.
    patrones_validos = {
        "chest": {"empuje", "apertura"},
        "back": {
            "traccion_vertical",
            "traccion_horizontal",
            "extension_espalda_cadera",
        },
        "shoulders": {
            "elevacion_lateral",
            "deltoide_posterior",
            "empuje_hombro",
        },
        "upper_arms": {"flexion_codo", "extension_codo"},
        "upper_legs": {
            "sentadilla",
            "unilateral_pierna",
            "bisagra_cadera",
            "curl_femoral",
            "extension_cuadriceps",
        },
        "legs": {
            "sentadilla",
            "unilateral_pierna",
            "bisagra_cadera",
            "curl_femoral",
            "extension_cuadriceps",
        },
        "glutes": {
            "extension_gluteo",
            "bisagra_cadera",
            "sentadilla",
            "unilateral_pierna",
            "abduccion_adduccion_cadera",
        },
        "calves": {"pantorrilla"},
        "abs": {
            "estabilidad_core",
            "flexion_abdominal",
            "rotacion_core",
        },
    }

    # Cardio: no confundirlo con ejercicios de fuerza o estiramientos.
    if grupo_objetivo == "cardio":
        palabras_excluidas = (
            "stretch", "alongamento", "cool-down", "cool down",
            "mobility", "mobilidade", "warmup", "warm-up",
            "warm up", "aquecimento",
        )
        candidatos = EjercicioBiblioteca.objects.filter(
            grupo__iexact="Cardio"
            ).order_by("id")

        elegidos = []

        for ejercicio in candidatos:
            nombre = _normalizar_valor(ejercicio.nombre)

            if ejercicio.id in seleccionados:
                continue

            if any(p in nombre for p in palabras_excluidas):
                continue

            elegidos.append(ejercicio)
            seleccionados.add(ejercicio.id)

            if len(elegidos) >= cantidad:
                break

        return elegidos

    # Cuerpo completo: exigir varios músculos principales y evitar
    # ejercicios de cuello, estiramientos y movimientos aislados.
    if grupo_objetivo == "full_body":
        candidatos = EjercicioBiblioteca.objects.filter(
            grupo__iexact="full_body"
        ).order_by("nombre", "id")

        elegidos = []

        for ejercicio in candidatos:
            if ejercicio.id in seleccionados:
                continue

            principales = _musculos_canonicos(
                ejercicio.musculos_principales
            )
            nombre = _normalizar_valor(ejercicio.nombre)

            excluidos = (
                "cuello", "neck", "stretch", "alongamento",
                "retraccion_de_menton", "chin_tuck",
            )

            if any(p in nombre for p in excluidos):
                continue

            # No aceptar ejercicios con un único músculo principal.
            if len(principales) < 2:
                continue

            elegidos.append(ejercicio)
            seleccionados.add(ejercicio.id)

            if len(elegidos) >= cantidad:
                break

        return elegidos

    objetivos = _musculos_canonicos(
        MUSCULOS_POR_GRUPO.get(grupo_objetivo, set())
    )

    candidatos = []

    ejercicios = EjercicioBiblioteca.objects.all().order_by("id")

    for ejercicio in ejercicios:
        if ejercicio.id in seleccionados:
            continue

        principales = _musculos_canonicos(
            ejercicio.musculos_principales
        )
        secundarios = _musculos_canonicos(
            ejercicio.musculos_secundarios
        )
        grupo_ejercicio = _normalizar_valor(ejercicio.grupo)

        coincide_principal = bool(objetivos & principales)
        coincide_secundario = bool(objetivos & secundarios)
        coincide_grupo = grupo_ejercicio in grupos_validos

        patron = _patron_movimiento(ejercicio, grupo_objetivo)

        # Excluir ejercicios claramente ajenos al movimiento objetivo.
        if grupo_objetivo in ("chest", "back", "shoulders",
                              "upper_arms", "upper_legs", "legs",
                              "glutes", "calves", "abs"):
            patrones = patrones_validos.get(grupo_objetivo, set())

            # En pantorrillas y abdomen, exigir movimiento específico.
            if grupo_objetivo in ("calves", "abs"):
                if patron not in patrones:
                    continue

            # En los demás grupos, si el nombre identifica un patrón,
            # debe corresponder al grupo objetivo.
            elif patron != "otro" and patron not in patrones:
                continue

        if grupo_objetivo == "glutes":
            if "glutes" not in principales:
                continue

            if patron not in {
                "extension_gluteo",
                "bisagra_cadera",
                "sentadilla",
                "unilateral_pierna",
            }:
                continue

        # No permitir ejercicios excesivamente generales en músculos
        # específicos, como Bear Walk 2.
        if len(principales) >= 5:
            continue


        if coincide_principal:
            prioridad = 0 if coincide_grupo else 1
        elif coincide_secundario and coincide_grupo:
            prioridad = 2
        else:
            continue

        # Para glúteos, priorizar extensión específica antes
        # de bisagras, sentadillas y ejercicios unilaterales.
        if grupo_objetivo == "glutes":
            prioridad_patron = {
                "extension_gluteo": 0,
                "bisagra_cadera": 1,
                "unilateral_pierna": 2,
                "sentadilla": 3,
            }.get(patron, 4)

            prioridad = prioridad * 10 + prioridad_patron

        candidatos.append((prioridad, ejercicio.id, ejercicio))



    candidatos.sort(key=lambda item: (item[0], item[1]))


    elegidos = []

    if grupo_objetivo in {"back", "upper_legs", "legs"}:
        if grupo_objetivo == "back":
            orden_patrones = [
                "traccion_horizontal",
                "traccion_vertical",
                "traccion_horizontal",
                "traccion_vertical",
                "extension_espalda_cadera",
            ]

        elif grupo_objetivo == "upper_legs":
            orden_patrones = [
                "curl_femoral",
                "bisagra_cadera",
                "extension_cuadriceps",
                "sentadilla",
                "unilateral_pierna",
            ]
        else:  # legs
            orden_patrones = [
                "sentadilla",
                "unilateral_pierna",
                "curl_femoral",
                "bisagra_cadera",
                "extension_cuadriceps",
            ]


        pendientes = candidatos.copy()



        while len(elegidos) < cantidad and pendientes:
            progreso = False

            for patron_objetivo in orden_patrones:
                if len(elegidos) >= cantidad:
                    break

                for candidato in pendientes:
                    _, ejercicio_id, ejercicio = candidato

                    if _patron_movimiento(ejercicio, grupo_objetivo) == patron_objetivo:
                        elegidos.append(ejercicio)
                        seleccionados.add(ejercicio_id)
                        pendientes.remove(candidato)
                        progreso = True
                        break

            if not progreso:
                break

        # Completar con los candidatos restantes si faltan puestos.
        for _, ejercicio_id, ejercicio in pendientes:
            if len(elegidos) >= cantidad:
                break

            elegidos.append(ejercicio)
            seleccionados.add(ejercicio_id)

        return elegidos

    # Selección general para los grupos que no usan balance por patrones.
    nombres_usados = {
        (ejercicio.nombre or "").strip().casefold()
        for ejercicio in elegidos
    }

    for _, ejercicio_id, ejercicio in candidatos:
        if len(elegidos) >= cantidad:
            break

        nombre = (ejercicio.nombre or "").strip().casefold()

        if nombre in nombres_usados:
            continue

        elegidos.append(ejercicio)
        seleccionados.add(ejercicio_id)
        nombres_usados.add(nombre)

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
