
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

from .calculos import calcular_objetivo_nutricional

from .serializers import (
    PlanNutricionalSerializer,
    ComidaSerializer,
    RegistroComidaSerializer,
    CategoriaAlimentoSerializer,
    AlimentoSerializer,
)


def usuario_actual(request):
    return get_object_or_404(Usuario, auth=request.user)


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
    {
        "nombre": "Plan mantenimiento",
        "descripcion": "Plan variado orientado a mantener hábitos de alimentación y energía diaria.",
        "calorias_diarias": 2000,
        "proteinas_g": 130,
        "carbohidratos_g": 230,
        "grasas_g": 65,
        "bloques": {
            "desayuno": ["Panes y harinas", "Lácteos", "Frutas"],
            "almuerzo": ["Proteínas", "Cereales y granos", "Verduras"],
            "cena": ["Proteínas", "Legumbres", "Verduras"],
            "snack": ["Frutos secos y semillas", "Frutas"],
        },
    },
    {
        "nombre": "Plan pérdida de peso",
        "descripcion": "Plan con porciones moderadas y variedad de verduras, frutas y fuentes de proteína.",
        "calorias_diarias": 1800,
        "proteinas_g": 140,
        "carbohidratos_g": 170,
        "grasas_g": 60,
        "bloques": {
            "desayuno": ["Lácteos", "Frutas", "Panes y harinas"],
            "almuerzo": ["Proteínas", "Verduras", "Legumbres"],
            "cena": ["Proteínas", "Verduras", "Legumbres"],
            "snack": ["Frutas", "Lácteos"],
        },
    },
    {
        "nombre": "Plan ganancia muscular",
        "descripcion": "Plan con mayor aporte energético y de proteínas para acompañar el entrenamiento de fuerza.",
        "calorias_diarias": 2400,
        "proteinas_g": 180,
        "carbohidratos_g": 270,
        "grasas_g": 70,
        "bloques": {
            "desayuno": ["Proteínas", "Lácteos", "Cereales y granos"],
            "almuerzo": ["Proteínas", "Cereales y granos", "Legumbres"],
            "cena": ["Proteínas", "Panes y harinas", "Verduras"],
            "snack": ["Lácteos", "Frutos secos y semillas"],
        },
    },
    {
        "nombre": "Plan vegetariano",
        "descripcion": "Plan basado en legumbres, cereales, frutas, verduras, lácteos y frutos secos.",
        "calorias_diarias": 2000,
        "proteinas_g": 120,
        "carbohidratos_g": 250,
        "grasas_g": 65,
        "bloques": {
            "desayuno": ["Lácteos", "Cereales y granos", "Frutas"],
            "almuerzo": ["Legumbres", "Cereales y granos", "Verduras"],
            "cena": ["Legumbres", "Verduras", "Lácteos"],
            "snack": ["Frutos secos y semillas", "Frutas"],
        },
    },
    {
        "nombre": "Plan rendimiento deportivo",
        "descripcion": "Plan con variedad de alimentos energéticos para acompañar la actividad física.",
        "calorias_diarias": 2400,
        "proteinas_g": 155,
        "carbohidratos_g": 300,
        "grasas_g": 65,
        "bloques": {
            "desayuno": ["Cereales y granos", "Lácteos", "Frutas"],
            "almuerzo": ["Proteínas", "Cereales y granos", "Verduras"],
            "cena": ["Proteínas", "Panes y harinas", "Verduras"],
            "snack": ["Frutas", "Lácteos", "Frutos secos y semillas"],
        },
    },
    {
        "nombre": "Plan alto en fibra",
        "descripcion": "Plan que prioriza legumbres, cereales, frutas y verduras.",
        "calorias_diarias": 2000,
        "proteinas_g": 125,
        "carbohidratos_g": 260,
        "grasas_g": 60,
        "bloques": {
            "desayuno": ["Frutas", "Cereales y granos", "Lácteos"],
            "almuerzo": ["Legumbres", "Verduras", "Cereales y granos"],
            "cena": ["Legumbres", "Verduras", "Frutas"],
            "snack": ["Frutas", "Frutos secos y semillas"],
        },
    },
]


def _marcar_recomendados(datos_planes, usuario):
    # Sin meta en el perfil se recomienda como "mantenerse", igual que el objetivo de calorías
    nombre_recomendado = META_A_PLAN_BASE.get(usuario.meta or "mantenerse")

    for plan in datos_planes:
        plan["recomendado"] = (
            not plan.get("generada_por_ia")
            and plan.get("nombre") == nombre_recomendado
        )

    return datos_planes


def _alimentos_por_categoria():
    """Alimentos activos agrupados por categoría (en minúsculas), en una sola consulta."""
    por_categoria = {}
    for alimento in (
        Alimento.objects
        .filter(activo=True)
        .select_related("categoria")
        .order_by("id")
    ):
        if alimento.categoria_id:
            por_categoria.setdefault(alimento.categoria.nombre.lower(), []).append(alimento)
    return por_categoria


def _agregar_comidas_base(plan, bloques, factor_porcion=1.0, alimentos_por_categoria=None):
    """
    Pone en el plan los dos primeros alimentos de cada categoría de la plantilla.
    Si el plan ya tenía esa comida, la actualiza en vez de crear otra: los
    registros históricos apuntan a ella y no se pueden romper.
    """
    if alimentos_por_categoria is None:
        alimentos_por_categoria = _alimentos_por_categoria()

    # Las comidas que ya tiene el plan, en una sola consulta
    existentes = {}
    for comida in plan.comidas.order_by("id"):
        existentes.setdefault((comida.alimento_id, comida.tipo), comida)

    orden = 0
    alimentos_usados = set()

    for tipo, categorias in bloques.items():
        for categoria_nombre in categorias:
            # Los dos primeros alimentos de cada categoría
            for alimento in alimentos_por_categoria.get(categoria_nombre.lower(), [])[:2]:
                if alimento.id in alimentos_usados:
                    continue

                datos_comida = {
                    "nombre": alimento.nombre,
                    "descripcion": alimento.descripcion,
                    "cantidad_base_g": round(100 * factor_porcion, 2),
                    "calorias": round(alimento.calorias_100g * factor_porcion, 1),
                    "proteinas_g": round(alimento.proteinas_100g * factor_porcion, 1),
                    "carbohidratos_g": round(alimento.carbohidratos_100g * factor_porcion, 1),
                    "grasas_g": round(alimento.grasas_100g * factor_porcion, 1),
                    "orden": orden,
                }

                comida_existente = existentes.get((alimento.id, tipo))
                if comida_existente:
                    for campo, valor in datos_comida.items():
                        setattr(comida_existente, campo, valor)
                    comida_existente.save()
                else:
                    Comida.objects.create(plan=plan, alimento=alimento, tipo=tipo, **datos_comida)

                alimentos_usados.add(alimento.id)
                orden += 1


class CategoriaAlimentoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        categorias = CategoriaAlimento.objects.all()

        return Response(
            CategoriaAlimentoSerializer(
                categorias,
                many=True,
            ).data
        )


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
            alimentos = alimentos.filter(
                nombre__icontains=buscar
            )

        if categoria:
            alimentos = alimentos.filter(
                categoria_id=categoria
            )

        return Response(
            AlimentoSerializer(
                alimentos[:100],
                many=True,
            ).data
        )


class PlanNutricionalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)

        # La primera vez que entra se le arman los planes principales. Si después
        # borra alguno a propósito, no vuelve solo (está el botón para recuperarlos).
        if _es_usuario_nuevo_en_nutricion(usuario):
            _asegurar_catalogo(usuario)

        planes = (
            PlanNutricional.objects
            .filter(usuario=usuario)
            .prefetch_related("comidas__alimento__categoria")
        )

        datos = PlanNutricionalSerializer(
            planes,
            many=True,
        ).data

        _marcar_recomendados(datos, usuario)

        return Response(datos)

    def post(self, request):
        usuario = usuario_actual(request)

        serializer = PlanNutricionalSerializer(
            data=request.data
        )

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


def _asegurar_catalogo(usuario):
    """
    Crea los planes principales que le falten al usuario (o que quedaron sin
    comidas). Normalmente ya existen: se revisa con una sola consulta.
    """
    completos = set(
        PlanNutricional.objects
        .filter(
            usuario=usuario,
            nombre__in=[p["nombre"] for p in PLANES_BASE],
            comidas__isnull=False,
        )
        .values_list("nombre", flat=True)
    )
    pendientes = [p for p in PLANES_BASE if p["nombre"] not in completos]
    alimentos = _alimentos_por_categoria() if pendientes else None

    for plantilla in pendientes:
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
                alimentos_por_categoria=alimentos,
            )


def _es_usuario_nuevo_en_nutricion(usuario):
    """Nunca ha tenido planes ni ha registrado comidas: todavía no conoce la sección."""
    return (
        not PlanNutricional.objects.filter(usuario=usuario).exists()
        and not RegistroComida.objects.filter(usuario=usuario).exists()
    )


class GenerarCatalogoPlanesView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = usuario_actual(request)
        _asegurar_catalogo(usuario)
        planes = (
            PlanNutricional.objects
            .filter(usuario=usuario)
            .prefetch_related("comidas__alimento__categoria")
        )

        datos = PlanNutricionalSerializer(
            planes,
            many=True,
        ).data

        _marcar_recomendados(datos, usuario)

        return Response(
            datos,
            status=status.HTTP_200_OK,
        )

class GenerarPlanModalidadView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        usuario = usuario_actual(request)
        nombre = str(request.data.get("nombre", "")).strip()

        plantilla = next(
            (p for p in PLANES_BASE if p["nombre"] == nombre),
            None,
        )

        if plantilla is None:
            return Response(
                {"detail": "La modalidad solicitada no existe."},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            _agregar_comidas_base(plan, plantilla["bloques"])

        plan.refresh_from_db()
        datos = PlanNutricionalSerializer(plan).data
        datos["recomendado"] = (
            usuario.meta == next(
                (
                    meta
                    for meta, nombre_plan in META_A_PLAN_BASE.items()
                    if nombre_plan == plantilla["nombre"]
                ),
                None,
            )
        )

        return Response(
            datos,
            status=status.HTTP_201_CREATED if creado else status.HTTP_200_OK,
        )
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

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )


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

            try:
                cantidad_g = float(
                    request.data.get("cantidad_g", 100) or 100
                )
            except (TypeError, ValueError):
                return Response(
                    {
                        "cantidad_g": (
                            "Ingresa una cantidad válida en gramos."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not 0 < cantidad_g <= 10000:
                return Response(
                    {
                        "cantidad_g": (
                            "La cantidad debe ser mayor que 0 "
                            "y no superar 10000 gramos."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            factor = cantidad_g / 100

            datos = {
                "alimento": alimento.id,
                "tipo": request.data.get("tipo", "snack"),
                "nombre": (
                    request.data.get("nombre") or alimento.nombre
                ),
                "descripcion": (
                    request.data.get("descripcion")
                    or alimento.descripcion
                ),
                "cantidad_base_g": cantidad_g,
                "calorias": round(
                    alimento.calorias_100g * factor, 2
                ),
                "proteinas_g": round(
                    alimento.proteinas_100g * factor, 2
                ),
                "carbohidratos_g": round(
                    alimento.carbohidratos_100g * factor, 2
                ),
                "grasas_g": round(
                    alimento.grasas_100g * factor, 2
                ),
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

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )





class RegistroComidaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)

        registros = (
            RegistroComida.objects
            .filter(usuario=usuario)
            .order_by("-fecha", "-id")
        )

        serializer = RegistroComidaSerializer(
            registros,
            many=True,
        )

        return Response(serializer.data)

    def post(self, request):
        usuario = usuario_actual(request)

        comida = get_object_or_404(
            Comida,
            pk=request.data.get("comida"),
            plan__usuario=usuario,
        )

        try:
            cantidad_g = float(
                request.data.get("cantidad_g", 100)
            )
        except (TypeError, ValueError):
            return Response(
                {
                    "cantidad_g": (
                        "Ingresa una cantidad válida en gramos."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not 0 < cantidad_g <= 10000:
            return Response(
                {
                    "cantidad_g": (
                        "La cantidad debe ser mayor que 0 "
                        "y no superar 10000 gramos."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        cantidad_base = comida.cantidad_base_g

        if cantidad_base is None or cantidad_base <= 0:
            return Response(
                {
                    "error": (
                        "La comida tiene una cantidad base inválida."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        factor = cantidad_g / cantidad_base

        registro = RegistroComida.objects.create(
            usuario=usuario,
            comida=comida,
            comida_nombre=comida.nombre,
            tipo=comida.tipo,
            cantidad_g=cantidad_g,
            calorias=round(comida.calorias * factor, 2),
            proteinas_g=round(
                comida.proteinas_g * factor, 2
            ),
            carbohidratos_g=round(
                comida.carbohidratos_g * factor, 2
            ),
            grasas_g=round(
                comida.grasas_g * factor, 2
            ),
        )

        serializer = RegistroComidaSerializer(registro)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class RegistroComidaDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        usuario = usuario_actual(request)

        registro = get_object_or_404(
            RegistroComida,
            pk=pk,
            usuario=usuario,
        )

        registro.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )



class ObjetivoNutricionalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)

        return Response(
            calcular_objetivo_nutricional(usuario)
        )


NOMBRE_PLAN_PERSONALIZADO = "Mi plan personalizado"

BLOQUES_POR_META = {
    plantilla["nombre"]: plantilla["bloques"]
    for plantilla in PLANES_BASE
}


class GenerarPlanPersonalizadoView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        usuario = usuario_actual(request)
        objetivo = calcular_objetivo_nutricional(usuario)

        nombre_base = META_A_PLAN_BASE.get(
            objetivo["meta"],
            PLANES_BASE[0]["nombre"],
        )

        plantilla = next(
            (
                p for p in PLANES_BASE
                if p["nombre"] == nombre_base
            ),
            PLANES_BASE[0],
        )

        # Si el objetivo no cambió desde la última vez (mismo peso, altura,
        # edad y meta), el plan ya está al día: se devuelve sin rehacerlo.
        existente = (
            PlanNutricional.objects
            .filter(usuario=usuario, nombre=NOMBRE_PLAN_PERSONALIZADO)
            .prefetch_related('comidas__alimento__categoria')
            .first()
        )
        if existente and existente.comidas.all() and all(
            float(getattr(existente, campo) or 0) == float(objetivo[clave])
            for campo, clave in (
                ('calorias_diarias', 'calorias'),
                ('proteinas_g', 'proteinas_g'),
                ('carbohidratos_g', 'carbohidratos_g'),
                ('grasas_g', 'grasas_g'),
            )
        ):
            plan_datos = PlanNutricionalSerializer(existente).data
            plan_datos['recomendado'] = False
            return Response({'plan': plan_datos, 'objetivo': objetivo}, status=status.HTTP_200_OK)

        plan, _creado = PlanNutricional.objects.update_or_create(
            usuario=usuario,
            nombre=NOMBRE_PLAN_PERSONALIZADO,
            defaults={
                "descripcion": (
                    "Plan generado automáticamente a partir de tu peso, "
                    "altura, edad y objetivo. Se recalcula cada vez que lo generas."
                ),
                "calorias_diarias": objetivo["calorias"],
                "proteinas_g": objetivo["proteinas_g"],
                "carbohidratos_g": objetivo["carbohidratos_g"],
                "grasas_g": objetivo["grasas_g"],
                "generada_por_ia": True,
            },
        )

        calorias_base_plantilla = (
            plantilla["calorias_diarias"] or 1
        )

        factor_porcion = (
            objetivo["calorias"] / calorias_base_plantilla
        )

        factor_porcion = max(
            0.5,
            min(factor_porcion, 2.0),
        )

        _agregar_comidas_base(
            plan,
            plantilla["bloques"],
            factor_porcion=factor_porcion,
        )

        plan = PlanNutricional.objects.prefetch_related('comidas__alimento__categoria').get(pk=plan.pk)
        plan_datos = PlanNutricionalSerializer(plan).data
        plan_datos["recomendado"] = False

        return Response(
            {
                "plan": plan_datos,
                "objetivo": objetivo,
            },
            status=status.HTTP_200_OK,
        )
