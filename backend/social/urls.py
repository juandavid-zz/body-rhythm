from django.urls import path

from .views import (
    BuscarUsuariosView,
    ComentarioDetalleView,
    ComentariosView,
    FuerzaView,
    SugerenciasView,
    EliminarSeguidorView,
    EntrenamientosPerfilView,
    FeedView,
    ListaRelacionesView,
    PerfilView,
    SeguirView,
    SolicitudDetalleView,
    SolicitudesView,
)

urlpatterns = [
    path('buscar/', BuscarUsuariosView.as_view()),
    path('feed/', FeedView.as_view()),
    path('sugerencias/', SugerenciasView.as_view()),
    path('registros/<int:id>/fuerza/', FuerzaView.as_view()),
    path('registros/<int:id>/comentarios/', ComentariosView.as_view()),
    path('comentarios/<int:id>/', ComentarioDetalleView.as_view()),
    path('solicitudes/', SolicitudesView.as_view()),
    path('solicitudes/<int:id>/', SolicitudDetalleView.as_view()),
    path('perfiles/<str:username>/', PerfilView.as_view()),
    path('perfiles/<str:username>/entrenamientos/', EntrenamientosPerfilView.as_view()),
    path('perfiles/<str:username>/seguidores/', ListaRelacionesView.as_view(tipo='seguidores')),
    path('perfiles/<str:username>/seguidos/', ListaRelacionesView.as_view(tipo='seguidos')),
    path('perfiles/<str:username>/seguir/', SeguirView.as_view()),
    path('perfiles/<str:username>/seguidor/', EliminarSeguidorView.as_view()),
]
