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
python completar.py catalogo_exdb.json faltan.json gifs ../../frontend/public/ejercicios/animadas
```

`completar.py` es la segunda pasada para los que quedaron sin animación
(`faltan.json` es la lista `[slug, nombre]` de esos ejercicios): busca un
ejercicio igual en ExerciseDB y prueba todos los GIF con ese nombre, porque
algunos dan 404.

`tercera.py` cubre los ejercicios importantes que no tienen un igual exacto:
usa la animación del mismo movimiento aunque cambie un poco el equipo (el
curl con pesa rusa usa el de mancuerna, la plancha lateral usa "side bridge").

- `emparejar.py` busca el ejercicio de ExerciseDB más parecido por nombre y equipo.
- `decidir.py` aplica la revisión a mano: descarta los que salían con otro
  ejercicio y fija algunos elegidos a mano.
- `emparejados.json` es la lista de los que salen de ExerciseDB (253 de los
  376 ejercicios de la biblioteca).
- `desde_repdb.py` hace los otros 123, listados en `desde_repdb.txt`: toma las
  fotos de inicio y final de RepDB, les quita el fondo, las pasa a gris y les
  aplica el mismo estilo. Son los que no están en ExerciseDB (TRX,
  estiramientos con banda...) y los que allá salían con otro equipo o postura
  (pesa rusa que en el GIF es mancuerna, anillas en vez de TRX...).

```bash
python desde_repdb.py ../../frontend/public/ejercicios ../../frontend/public/ejercicios/animadas $(tr -d '\r' < desde_repdb.txt)
```

Cada ejercicio se revisó poniendo lado a lado sus fotos de RepDB (que son las
que coinciden con el nombre, la descripción y los músculos de la app) y las
dos posturas de la animación.

## Versión en alta calidad (la que usa la app)

`mejorar.py` vuelve a hacer los 376 videos con más calidad:

1. Cada postura se agranda con **Real-ESRGAN** (modelo `realesr-animevideov3`,
   hecho para dibujos): las de ExerciseDB x4 (180 → 720 px) y las de RepDB x2.
2. Se estiliza a 720 px (los filtros de `estilizar_gifs.procesar` se escalan
   con el tamaño).
3. **RIFE** (`rife-v4.6`, con `-x -z` para menos sombras) dibuja 33 cuadros
   entre las dos posturas: el cuerpo se mueve en vez de fundirse.
4. Video a 30 cuadros por segundo con entrada y salida suaves, y póster de 480 px.

Los dos programas son gratis y corren en la tarjeta de video con Vulkan:
[realesrgan-ncnn-vulkan](https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0)
y [rife-ncnn-vulkan](https://github.com/nihui/rife-ncnn-vulkan/releases/tag/20221029).
Se descomprimen en una carpeta (`<carpeta_ia>`), no van en el repositorio.

```bash
python mejorar.py emparejados.json desde_repdb.txt gifs ../../frontend/public/ejercicios \
  ../../frontend/public/ejercicios/animadas <carpeta_ia> <carpeta_trabajo> \
  $(python -c "import json;print(' '.join(json.load(open('../../frontend/src/data/animaciones.json'))))")
```

Con una RTX 3050 tarda unos 10 segundos por ejercicio.

Después de generar, la lista de `frontend/src/data/animaciones.json` debe tener
el nombre de cada video que exista en la carpeta.

ExerciseDB avisa que su versión gratis no es para producción y no publica la
licencia de los GIF: revisarlo antes de lanzar la app.
