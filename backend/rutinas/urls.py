from django.urls import path

from .views import (
    EjercicioListView,
    EjercicioDetailView,
    RutinaListView,
    RutinaDetailView,
    RutinaFavoritaView,
    AgregarEjercicioRutinaView,
    RutinaEjercicioDetailView,
    GenerarCatalogoRutinasView,
)


urlpatterns = [

    # ========================================================
    # EJERCICIOS
    # ========================================================

    path(
        'ejercicios/',
        EjercicioListView.as_view()
    ),

    path(
        'ejercicios/<int:pk>/',
        EjercicioDetailView.as_view()
    ),


    # ========================================================
    # GENERAR CATÁLOGO DE RUTINAS BASE
    # ========================================================

    path(
        'rutinas/generar-catalogo/',
        GenerarCatalogoRutinasView.as_view()
    ),


    # ========================================================
    # RUTINAS POR USUARIO
    # ========================================================

    path(
        'usuarios/<int:usuario_id>/rutinas/',
        RutinaListView.as_view()
    ),

    path(
        'usuarios/<int:usuario_id>/rutinas/<int:pk>/',
        RutinaDetailView.as_view()
    ),

    path(
        'usuarios/<int:usuario_id>/rutinas/<int:pk>/favorita/',
        RutinaFavoritaView.as_view()
    ),

    path(
        'usuarios/<int:usuario_id>/rutinas/<int:pk>/ejercicios/',
        AgregarEjercicioRutinaView.as_view()
    ),

    path(
        'usuarios/<int:usuario_id>/rutinas/<int:rutina_id>/ejercicios/<int:pk>/',
        RutinaEjercicioDetailView.as_view()
    ),
]