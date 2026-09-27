from django.urls import path
from .views import (
    PlanNutricionalListView,
    PlanNutricionalDetailView,
    ComidaListView,
    ComidaDetailView,
    RegistroComidaListView,
)

urlpatterns = [
    path('nutricion/planes/', PlanNutricionalListView.as_view()),
    path('nutricion/planes/<int:pk>/', PlanNutricionalDetailView.as_view()),
    path('nutricion/planes/<int:plan_id>/comidas/', ComidaListView.as_view()),
    path('nutricion/comidas/<int:pk>/', ComidaDetailView.as_view()),
    path('nutricion/registros/', RegistroComidaListView.as_view()),
]
