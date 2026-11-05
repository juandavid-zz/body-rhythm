# Animaciones de los ejercicios

Genera los videos de `frontend/public/ejercicios/animadas/` a partir de los GIF
gratis de ExerciseDB V1. A cada GIF se le quita el fondo blanco, se le pone el
cuerpo opaco con líneas claras, los músculos en morado a rosa y las pesas en
morado, y se guarda como MP4 (con el escenario morado incluido) más un póster
WebP para las tarjetas.

Necesita un entorno aparte con `numpy pillow scipy imageio-ffmpeg`
(no van en `backend/requirements.txt` porque la app no los usa).

```bash
python bajar_catalogo.py catalogo_exdb.json
python emparejar.py ../../backend/repdb/free.es.json catalogo_exdb.json pares.json
python decidir.py pares.json emparejados.json
python hacer_videos.py emparejados.json gifs ../../frontend/public/ejercicios/animadas
```

- `emparejar.py` busca el ejercicio de ExerciseDB más parecido por nombre y equipo.
- `decidir.py` aplica la revisión a mano: descarta los que salían con otro
  ejercicio y fija algunos elegidos a mano.
- `emparejados.json` es la lista final que se usó (229 de los 376 ejercicios
  de la biblioteca quedaron con animación; el resto usa sus fotos de inicio y final).

Después de generar, la lista de `frontend/src/data/animaciones.json` debe tener
el nombre de cada video que exista en la carpeta.

ExerciseDB avisa que su versión gratis no es para producción y no publica la
licencia de los GIF: revisarlo antes de lanzar la app.
