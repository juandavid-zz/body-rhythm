from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from users.models import Usuario
from .models import PlanNutricional, Comida, RegistroComida
from .serializers import PlanNutricionalSerializer, ComidaSerializer, RegistroComidaSerializer


def usuario_actual(request):
    return get_object_or_404(Usuario, auth=request.user)


class PlanNutricionalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)
        planes = PlanNutricional.objects.filter(usuario=usuario).prefetch_related('comidas')
        return Response(PlanNutricionalSerializer(planes, many=True).data)

    def post(self, request):
        usuario = usuario_actual(request)
        serializer = PlanNutricionalSerializer(data=request.data)
        if serializer.is_valid():
            plan = serializer.save(usuario=usuario)
            return Response(PlanNutricionalSerializer(plan).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PlanNutricionalDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        usuario = usuario_actual(request)
        return get_object_or_404(PlanNutricional, pk=pk, usuario=usuario)

    def get(self, request, pk):
        plan = self.get_object(request, pk)
        return Response(PlanNutricionalSerializer(plan).data)

    def put(self, request, pk):
        plan = self.get_object(request, pk)
        serializer = PlanNutricionalSerializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(PlanNutricionalSerializer(plan).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        plan = self.get_object(request, pk)
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ComidaListView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, plan_id):
        usuario = usuario_actual(request)
        plan = get_object_or_404(PlanNutricional, pk=plan_id, usuario=usuario)
        serializer = ComidaSerializer(data=request.data)
        if serializer.is_valid():
            comida = serializer.save(plan=plan)
            return Response(ComidaSerializer(comida).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ComidaDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        usuario = usuario_actual(request)
        return get_object_or_404(Comida, pk=pk, plan__usuario=usuario)

    def patch(self, request, pk):
        comida = self.get_object(request, pk)
        serializer = ComidaSerializer(comida, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(ComidaSerializer(comida).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        comida = self.get_object(request, pk)
        comida.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RegistroComidaListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = usuario_actual(request)
        registros = RegistroComida.objects.filter(usuario=usuario).select_related('comida')
        return Response(RegistroComidaSerializer(registros, many=True).data)

    def post(self, request):
        usuario = usuario_actual(request)
        comida = get_object_or_404(Comida, pk=request.data.get('comida'), plan__usuario=usuario)
        registro = RegistroComida.objects.create(usuario=usuario, comida=comida)
        return Response(RegistroComidaSerializer(registro).data, status=status.HTTP_201_CREATED)
