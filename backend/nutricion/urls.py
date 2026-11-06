
from django.urls import path

from .views import (
    CategoriaAlimentoListView,
    AlimentoListView,
    PlanNutricionalListView,
    PlanNutricionalDetailView,
    GenerarCatalogoPlanesView,
    GenerarPlanPersonalizadoView,
    GenerarPlanModalidadView,
    ObjetivoNutricionalView,
    ComidaListView,
    ComidaDetailView,
    RegistroComidaListView,
    RegistroComidaDetailView,
)

urlpatterns = [
    path(
        "nutricion/categorias/",
        CategoriaAlimentoListView.as_view(),
    ),
    path(
        "nutricion/alimentos/",
        AlimentoListView.as_view(),
    ),
    path(
        "nutricion/planes/generar-catalogo/",
        GenerarCatalogoPlanesView.as_view(),
    ),
    path(
        "nutricion/planes/generar-personalizado/",
        GenerarPlanPersonalizadoView.as_view(),
    ),
    path(
        "nutricion/planes/generar-modalidad/",
        GenerarPlanModalidadView.as_view(),
    ),
    path(
        "nutricion/objetivo/",
        ObjetivoNutricionalView.as_view(),
    ),
    path(
        "nutricion/planes/",
        PlanNutricionalListView.as_view(),
    ),
    path(
        "nutricion/planes/<int:pk>/",
        PlanNutricionalDetailView.as_view(),
    ),
    path(
        "nutricion/planes/<int:plan_id>/comidas/",
        ComidaListView.as_view(),
    ),
    path(
        "nutricion/comidas/<int:pk>/",
        ComidaDetailView.as_view(),
    ),
    path(
        "nutricion/registros/",
        RegistroComidaListView.as_view(),
    ),
    path(
        "nutricion/registros/<int:pk>/",
        RegistroComidaDetailView.as_view(),
    ),
]
