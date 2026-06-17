from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import Ejercicio, Rutina, RutinaEjercicio
from .serializers import EjercicioSerializer, RutinaSerializer, RutinaEjercicioSerializer
from users.models import Usuario


# ── EJERCICIOS ──────────────────────────────────────────────
class EjercicioListView(APIView):
    def get(self, request):
        grupo = request.query_params.get('grupo_muscular')
        qs = Ejercicio.objects.all()
        if grupo:
            qs = qs.filter(grupo_muscular=grupo)
        serializer = EjercicioSerializer(qs, many=True)
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
            return Ejercicio.objects.get(pk=pk)
        except Ejercicio.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'No encontrado'}, status=404)
        return Response(EjercicioSerializer(obj).data)

    def put(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'No encontrado'}, status=404)
        serializer = EjercicioSerializer(obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'No encontrado'}, status=404)
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── RUTINAS ─────────────────────────────────────────────────
class RutinaListView(APIView):
    def get(self, request, usuario_id):
        try:
            usuario = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        rutinas = Rutina.objects.filter(usuario=usuario)
        return Response(RutinaSerializer(rutinas, many=True).data)

    def post(self, request, usuario_id):
        try:
            usuario = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)
        serializer = RutinaSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(usuario=usuario)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class RutinaDetailView(APIView):
    def get_object(self, pk):
        try:
            return Rutina.objects.get(pk=pk)
        except Rutina.DoesNotExist:
            return None

    def get(self, request, usuario_id, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'No encontrada'}, status=404)
        return Response(RutinaSerializer(obj).data)

    def put(self, request, usuario_id, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'No encontrada'}, status=404)
        serializer = RutinaSerializer(obj, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, usuario_id, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response({'error': 'No encontrada'}, status=404)
        obj.delete()
        return Response(status=204)


class RutinaFavoritaView(APIView):
    def patch(self, request, usuario_id, pk):
        try:
            rutina = Rutina.objects.get(pk=pk)
        except Rutina.DoesNotExist:
            return Response({'error': 'No encontrada'}, status=404)
        rutina.es_favorita = not rutina.es_favorita
        rutina.save()
        return Response({'es_favorita': rutina.es_favorita})


class AgregarEjercicioRutinaView(APIView):
    def post(self, request, usuario_id, pk):
        try:
            rutina = Rutina.objects.get(pk=pk)
        except Rutina.DoesNotExist:
            return Response({'error': 'Rutina no encontrada'}, status=404)
        serializer = RutinaEjercicioSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(rutina=rutina)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)