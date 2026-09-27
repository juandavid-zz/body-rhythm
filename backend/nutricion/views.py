from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from users.models import Usuario
from .models import (
    PlanNutricional,
    Comida,
    RegistroComida,
    CategoriaAlimento,
    Alimento,
)
from .calculos import calcular_objetivo_nutricional, calorias_para_comida
from .serializers import (
    PlanNutricionalSerializer,
    ComidaSerializer,
    RegistroComidaSerializer,
    CategoriaAlimentoSerializer,
    AlimentoSerializer,
)


def usuario_actual(request):
    return get_object_or_404(Usuario, auth=request.user)


# Catálogo base. No usa IMC ni IA todavía.
# Usa únicamente categorías que ya existen en el catálogo actual.
# A qué plan base del catálogo corresponde cada meta del usuario.
# Se usa solo para marcar "recomendado" en la lista, no cambia lo que
# ya existe en el catálogo.
META_A_PLAN_BASE = {
    "perder_peso": "Plan balance ligero",
    "ganar_musculo": "Plan alto en proteína",
    "mantenerse": "Plan equilibrado",
    "mejorar_resistencia": "Plan energía y entrenamiento",
}


PLANES_BASE = [
    {
        "nombre": "Plan equilibrado",
        "descripcion": "Plan base con variedad de proteínas, cereales, verduras, frutas y lácteos.",
        "calorias_diarias": 2000,
        "proteinas_g": 150,
        "carbohidratos_g": 220,
        "grasas_g": 65,
        "bloques": {
            "desayuno": ["Panes y harinas", "Lácteos", "Frutas"],
            "almuerzo": ["Proteínas", "Cereales y granos", "Verduras"],
            "cena": ["Legumbres", "Verduras", "Proteínas"],
            "snack": ["Frutos secos y semillas", "Snacks"],
        },
    },
    {
        "nombre": "Plan alto en proteína",
        "descripcion": "Plan base centrado en alimentos con mayor aporte de proteína.",
        "calorias_diarias": 2200,
        "proteinas_g": 180,
        "carbohidratos_g": 210,
        "grasas_g": 70,
        "bloques": {
            "desayuno": ["Proteínas", "Lácteos", "Panes y harinas"],
            "almuerzo": ["Proteínas", "Cereales y granos", "Verduras"],
            "cena": ["Proteínas", "Legumbres", "Verduras"],
            "snack": ["Lácteos", "Frutos secos y semillas"],
        },
    },
    {
        "nombre": "Plan energía y entrenamiento",
        "descripcion": "Plan base con alimentos variados para acompañar días de entrenamiento.",
        "calorias_diarias": 2300,
        "proteinas_g": 160,
        "carbohidratos_g": 280,
        "grasas_g": 65,
        "bloques": {
            "desayuno": ["Cereales y granos", "Lácteos", "Frutas"],
            "almuerzo": ["Proteínas", "Cereales y granos", "Verduras"],
            "cena": ["Panes y harinas", "Proteínas", "Verduras"],
            "snack": ["Frutas", "Snacks", "Frutos secos y semillas"],
        },
    },
    {
        "nombre": "Plan balance ligero",
        "descripcion": "Plan base con énfasis en verduras, frutas, proteínas y comidas variadas.",
        "calorias_diarias": 1800,
        "proteinas_g": 140,
        "carbohidratos_g": 180,
        "grasas_g": 60,
        "bloques": {
            "desayuno": ["Lácteos", "Frutas", "Panes y harinas"],
            "almuerzo": ["Proteínas", "Verduras", "Legumbres"],
            "cena": ["Proteínas", "Verduras", "Frutas"],
            "snack": ["Frutas", "Lácteos"],
        },
    },
]


def _marcar_recomendados(datos_planes, usuario):
    """Añade 'recomendado': True al plan del catálogo que mejor se ajusta
    a la meta del usuario, sin tocar la base de datos."""
    nombre_recomendado = META_A_PLAN_BASE.get(usuario.meta)
    for plan in datos_planes:
        plan["recomendado"] = (
            not plan.get("generada_por_ia")
            and plan.get("nombre") == nombre_recomendado
        )
    return datos_planes


def _agregar_comidas_base(plan, bloques, factor_porcion=1.0):
    if plan.comidas.exists():
        return

    orden = 0
    alimentos_usados = set()

    for tipo, categorias in bloques.items():
        for categoria_nombre in categorias:
            alimentos = (
                Alimento.objects
                .filter(
                    categoria__nombre__iexact=categoria_nombre,
                    activo=True,
                )
                .order_by("id")[:2]
            )

            for alimento in alimentos:
                if alimento.id in alimentos_usados:
                    continue

                Comida.objects.create(
                    plan=plan,
                    alimento=alimento,
                    tipo=tipo,
                    nombre=alimento.nombre,
                    descripcion=alimento.descripcion,
                    calorias=round(alimento.calorias_100g * factor_porcion, 1),
                    proteinas_g=round(alimento.proteinas_100g * factor_porcion, 1),
                    carbohidratos_g=round(alimento.carbohidratos_100g * factor_porcion, 1),
                    grasas_g=round(alimento.grasas_100g * factor_porcion, 1),
                    orden=orden,
                )
                alimentos_usados.add(alimento.id)
                orden += 1


class CategoriaAlimentoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categorias = CategoriaAlimento.objects.all()
        return Response(CategoriaAlimentoSerializer(categorias, many=True).data)


class AlimentoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        buscar = request.query_params.get("buscar", "").strip()
        categoria = request.query_params.get("categoria", "").strip()

        alimentos = (
            Alimento.objects
            .filter(activo=True)
            .select_related("categoria")
        )

        if buscar:
            alimentos = alimentos.filter(nombre__icontains=buscar)

        if categoria:
            alimentos = alimentos.filter(categoria_id=categoria)

        return Response(
            AlimentoSerializer(alimentos[:100], many=True).data
        )


class PlanNutricionalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)

        planes = (
            PlanNutricional.objects
            .filter(usuario=usuario)
            .prefetch_related("comidas__alimento")
        )

        datos = PlanNutricionalSerializer(planes, many=True).data
        _marcar_recomendados(datos, usuario)

        return Response(datos)

    def post(self, request):
        usuario = usuario_actual(request)
        serializer = PlanNutricionalSerializer(data=request.data)

        if serializer.is_valid():
            plan = serializer.save(usuario=usuario)
            return Response(
                PlanNutricionalSerializer(plan).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class GenerarCatalogoPlanesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = usuario_actual(request)

        for plantilla in PLANES_BASE:
            plan, creado = PlanNutricional.objects.get_or_create(
                usuario=usuario,
                nombre=plantilla["nombre"],
                defaults={
                    "descripcion": plantilla["descripcion"],
                    "calorias_diarias": plantilla["calorias_diarias"],
                    "proteinas_g": plantilla["proteinas_g"],
                    "carbohidratos_g": plantilla["carbohidratos_g"],
                    "grasas_g": plantilla["grasas_g"],
                    "generada_por_ia": False,
                },
            )

            if creado or not plan.comidas.exists():
                _agregar_comidas_base(
                    plan,
                    plantilla["bloques"],
                )

        planes = (
            PlanNutricional.objects
            .filter(usuario=usuario)
            .prefetch_related("comidas__alimento")
        )

        datos = PlanNutricionalSerializer(planes, many=True).data
        _marcar_recomendados(datos, usuario)

        return Response(datos, status=status.HTTP_200_OK)


class PlanNutricionalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        usuario = usuario_actual(request)

        return get_object_or_404(
            PlanNutricional,
            pk=pk,
            usuario=usuario,
        )

    def get(self, request, pk):
        return Response(
            PlanNutricionalSerializer(
                self.get_object(request, pk)
            ).data
        )

    def put(self, request, pk):
        plan = self.get_object(request, pk)
        serializer = PlanNutricionalSerializer(
            plan,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                PlanNutricionalSerializer(plan).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, pk):
        self.get_object(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ComidaListView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, plan_id):
        usuario = usuario_actual(request)
        plan = get_object_or_404(
            PlanNutricional,
            pk=plan_id,
            usuario=usuario,
        )

        alimento_id = request.data.get("alimento")

        if alimento_id:
            alimento = get_object_or_404(
                Alimento,
                pk=alimento_id,
                activo=True,
            )

            cantidad_g = float(
                request.data.get("cantidad_g", 100) or 100
            )
            factor = cantidad_g / 100

            datos = {
                "alimento": alimento.id,
                "tipo": request.data.get("tipo", "snack"),
                "nombre": request.data.get("nombre") or alimento.nombre,
                "descripcion": request.data.get("descripcion") or alimento.descripcion,
                "calorias": round(alimento.calorias_100g * factor, 2),
                "proteinas_g": round(alimento.proteinas_100g * factor, 2),
                "carbohidratos_g": round(alimento.carbohidratos_100g * factor, 2),
                "grasas_g": round(alimento.grasas_100g * factor, 2),
                "orden": request.data.get("orden", 0),
            }
        else:
            datos = request.data.copy()

        serializer = ComidaSerializer(data=datos)

        if serializer.is_valid():
            comida = serializer.save(plan=plan)
            return Response(
                ComidaSerializer(comida).data,
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )


class ComidaDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        usuario = usuario_actual(request)
        return get_object_or_404(
            Comida,
            pk=pk,
            plan__usuario=usuario,
        )

    def patch(self, request, pk):
        comida = self.get_object(request, pk)
        serializer = ComidaSerializer(
            comida,
            data=request.data,
            partial=True,
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                ComidaSerializer(comida).data
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    def delete(self, request, pk):
        self.get_object(request, pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegistroComidaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)
        registros = (
            RegistroComida.objects
            .filter(usuario=usuario)
            .select_related("comida")
        )

        return Response(
            RegistroComidaSerializer(registros, many=True).data
        )

    def post(self, request):
        usuario = usuario_actual(request)
        comida = get_object_or_404(
            Comida,
            pk=request.data.get("comida"),
            plan__usuario=usuario,
        )

        registro = RegistroComida.objects.create(
            usuario=usuario,
            comida=comida,
        )

        return Response(
            RegistroComidaSerializer(registro).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# OBJETIVO NUTRICIONAL PERSONALIZADO (peso, altura, edad, meta)
# ============================================================

class ObjetivoNutricionalView(APIView):
    """Calorías y macros calculados a partir del perfil del usuario.
    No crea nada, solo informa el objetivo (útil para mostrarlo en el
    frontend aunque el usuario no haya generado su plan personalizado)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)
        return Response(calcular_objetivo_nutricional(usuario))


# Nombre fijo del plan que se genera a la medida de cada usuario.
NOMBRE_PLAN_PERSONALIZADO = 'Mi plan personalizado'

# Qué bloques de categorías usar en el plan personalizado, según la meta
# (mismos bloques que ya existen en el catálogo base, para reutilizar
# los alimentos que ya están cargados).
BLOQUES_POR_META = {
    plantilla["nombre"]: plantilla["bloques"] for plantilla in PLANES_BASE
}


class GenerarPlanPersonalizadoView(APIView):
    """Genera (o actualiza) el plan alimenticio hecho a la medida del
    usuario: calorías y macros calculados con su peso/altura/edad/meta,
    y comidas escaladas para acercarse a esas calorías diarias."""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        usuario = usuario_actual(request)
        objetivo = calcular_objetivo_nutricional(usuario)

        nombre_base = META_A_PLAN_BASE.get(objetivo['meta'], PLANES_BASE[0]['nombre'])
        plantilla = next(
            (p for p in PLANES_BASE if p['nombre'] == nombre_base),
            PLANES_BASE[0],
        )

        plan, _creado = PlanNutricional.objects.update_or_create(
            usuario=usuario,
            nombre=NOMBRE_PLAN_PERSONALIZADO,
            defaults={
                'descripcion': (
                    'Plan generado automáticamente a partir de tu peso, '
                    'altura, edad y objetivo. Se recalcula cada vez que lo generas.'
                ),
                'calorias_diarias': objetivo['calorias'],
                'proteinas_g': objetivo['proteinas_g'],
                'carbohidratos_g': objetivo['carbohidratos_g'],
                'grasas_g': objetivo['grasas_g'],
                'generada_por_ia': True,
            },
        )

        # Se regenera completo cada vez: así siempre queda al día con el
        # objetivo actual (si cambió el peso o la meta, cambian las porciones).
        plan.comidas.all().delete()

        # Calorías base del plan plantilla (referencia de 100g por alimento)
        # para saber cuánto hay que escalar cada porción.
        calorias_base_plantilla = plantilla['calorias_diarias'] or 1
        factor_porcion = objetivo['calorias'] / calorias_base_plantilla
        # Limitar el factor para que las porciones no queden absurdas
        # si el objetivo calculado es muy distinto al de la plantilla.
        factor_porcion = max(0.5, min(factor_porcion, 2.0))

        _agregar_comidas_base(
            plan,
            plantilla['bloques'],
            factor_porcion=factor_porcion,
        )

        plan.refresh_from_db()
        plan_datos = PlanNutricionalSerializer(plan).data
        plan_datos['recomendado'] = False  # es "el tuyo", no hace falta la etiqueta

        return Response(
            {
                'plan': plan_datos,
                'objetivo': objetivo,
            },
            status=status.HTTP_200_OK,
        )
