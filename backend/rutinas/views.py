from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Ejercicio, Rutina, RutinaEjercicio
from .serializers import (
    EjercicioSerializer,
    RutinaSerializer,
    RutinaEjercicioSerializer,
)

from users.models import Usuario


# ============================================================
# EJERCICIOS
# ============================================================

class EjercicioListView(APIView):

    def get(self, request):
        grupo = request.query_params.get('grupo_muscular')

        qs = Ejercicio.objects.all().order_by('nombre')

        if grupo:
            qs = qs.filter(grupo_muscular=grupo)

        serializer = EjercicioSerializer(qs, many=True)

        return Response(serializer.data)

    def post(self, request):
        serializer = EjercicioSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class EjercicioDetailView(APIView):

    def get_object(self, pk):
        try:
            return Ejercicio.objects.get(pk=pk)
        except Ejercicio.DoesNotExist:
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
        'descripcion': (
            'Entrenamiento general para trabajar '
            'todo el cuerpo.'
        ),
        'series': 3,
        'repeticiones': 10,
        'descanso': 60,
        'grupos': [
            ('cuadriceps', 1),
            ('femoral', 1),
            ('gluteos', 1),
            ('pecho', 1),
            ('espalda', 1),
            ('hombros', 1),
            ('abdomen', 1),
            ('cardio', 1),
        ],
    },

    {
        'nombre': 'Tren superior',
        'descripcion': (
            'Rutina enfocada en pecho, espalda, '
            'hombros y brazos.'
        ),
        'series': 3,
        'repeticiones': 10,
        'descanso': 75,
        'grupos': [
            ('pecho', 2),
            ('espalda', 2),
            ('hombros', 1),
            ('biceps', 1),
            ('triceps', 1),
            ('abdomen', 1),
        ],
    },

    {
        'nombre': 'Tren inferior',
        'descripcion': (
            'Entrenamiento enfocado en piernas '
            'y zona inferior del cuerpo.'
        ),
        'series': 3,
        'repeticiones': 10,
        'descanso': 75,
        'grupos': [
            ('cuadriceps', 2),
            ('femoral', 2),
            ('gluteos', 2),
            ('pantorrillas', 1),
            ('abdomen', 1),
        ],
    },

    {
        'nombre': 'Glúteos y piernas',
        'descripcion': (
            'Rutina enfocada en glúteos, piernas '
            'y pantorrillas.'
        ),
        'series': 3,
        'repeticiones': 12,
        'descanso': 60,
        'grupos': [
            ('gluteos', 3),
            ('cuadriceps', 2),
            ('femoral', 2),
            ('pantorrillas', 1),
        ],
    },

    {
        'nombre': 'Cardio',
        'descripcion': (
            'Entrenamiento orientado al trabajo '
            'cardiovascular y resistencia.'
        ),
        'series': 3,
        'repeticiones': 12,
        'descanso': 45,
        'grupos': [
            ('cardio', 5),
            ('cuerpo_completo', 2),
            ('abdomen', 1),
        ],
    },

    {
        'nombre': 'Tonificación',
        'descripcion': (
            'Rutina equilibrada para trabajar '
            'diferentes grupos musculares.'
        ),
        'series': 3,
        'repeticiones': 12,
        'descanso': 60,
        'grupos': [
            ('pecho', 1),
            ('espalda', 1),
            ('hombros', 1),
            ('biceps', 1),
            ('triceps', 1),
            ('gluteos', 1),
            ('cuadriceps', 1),
            ('abdomen', 1),
        ],
    },

    {
        'nombre': 'Ganancia muscular',
        'descripcion': (
            'Rutina enfocada en fuerza '
            'e hipertrofia muscular.'
        ),
        'series': 4,
        'repeticiones': 10,
        'descanso': 90,
        'grupos': [
            ('pecho', 2),
            ('espalda', 2),
            ('hombros', 1),
            ('biceps', 1),
            ('triceps', 1),
            ('cuadriceps', 1),
            ('femoral', 1),
            ('gluteos', 1),
        ],
    },

    {
        'nombre': 'Pérdida de peso',
        'descripcion': (
            'Entrenamiento combinado para favorecer '
            'el gasto energético.'
        ),
        'series': 3,
        'repeticiones': 12,
        'descanso': 45,
        'grupos': [
            ('cardio', 3),
            ('cuerpo_completo', 2),
            ('cuadriceps', 1),
            ('gluteos', 1),
            ('abdomen', 1),
        ],
    },
]


# ============================================================
# GENERAR CATÁLOGO DE RUTINAS PARA UN USUARIO
# ============================================================

class GenerarCatalogoRutinasView(APIView):

    """
    Genera automáticamente las rutinas base
    disponibles para el usuario.

    Esta versión NO utiliza:

    - IMC
    - peso
    - altura
    - IA
    - objetivo
    - días de entrenamiento

    La adaptación personalizada se hará
    posteriormente mediante la IA.
    """

    @transaction.atomic
    def post(self, request):

        usuario_id = request.data.get('usuario_id')

        if not usuario_id:
            return Response(
                {
                    'error':
                    'Debes enviar usuario_id.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario = get_object_or_404(
            Usuario,
            pk=usuario_id
        )

        rutinas_generadas = []

        for configuracion in RUTINAS_BASE:

            nombre = configuracion['nombre']

            # ------------------------------------------------
            # BUSCAR O CREAR LA RUTINA
            # ------------------------------------------------

            rutina, creada = Rutina.objects.get_or_create(
                usuario=usuario,
                nombre=nombre,
                defaults={
                    'descripcion':
                        configuracion['descripcion'],
                    'es_favorita': False,
                }
            )

            # ------------------------------------------------
            # SI ES NUEVA O ESTÁ VACÍA,
            # CARGAMOS SUS EJERCICIOS
            # ------------------------------------------------

            if creada or not rutina.rutinaejercicio_set.exists():

                if not creada:
                    rutina.rutinaejercicio_set.all().delete()

                orden = 1

                for grupo, cantidad in configuracion['grupos']:

                    ejercicios = list(
                        Ejercicio.objects
                        .filter(
                            grupo_muscular=grupo
                        )
                        .order_by('id')[:cantidad]
                    )

                    for ejercicio in ejercicios:

                        RutinaEjercicio.objects.create(
                            rutina=rutina,
                            ejercicio=ejercicio,
                            series=configuracion['series'],
                            repeticiones=configuracion[
                                'repeticiones'
                            ],
                            descanso_segundos=configuracion[
                                'descanso'
                            ],
                            orden=orden
                        )

                        orden += 1

            rutinas_generadas.append(rutina)

        # ----------------------------------------------------
        # VOLVER A CONSULTAR CON LOS EJERCICIOS
        # ----------------------------------------------------

        rutinas = (
            Rutina.objects
            .filter(
                usuario=usuario,
                nombre__in=[
                    rutina['nombre']
                    for rutina in RUTINAS_BASE
                ]
            )
            .prefetch_related(
                'rutinaejercicio_set__ejercicio'
            )
            .order_by('id')
        )

        return Response(
            {
                'mensaje':
                    'Catálogo de rutinas generado correctamente.',

                'rutinas':
                    _marcar_recomendadas(
                        RutinaSerializer(rutinas, many=True).data,
                        usuario,
                    ),

                'total':
                    rutinas.count(),
            },
            status=status.HTTP_201_CREATED
        )