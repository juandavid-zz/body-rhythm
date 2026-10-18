from difflib import SequenceMatcher
from users.models import Ejercicio as Biblioteca
from rutinas.models import Ejercicio as Antiguo

biblioteca = list(Biblioteca.objects.all())

print("=== POSIBLES EQUIVALENCIAS ===")

for viejo in Antiguo.objects.all():
    coincidencia = any(
        viejo.nombre.strip().casefold() == nuevo.nombre.strip().casefold()
        for nuevo in biblioteca
    )

    if coincidencia:
        continue

    candidatos = []

    for nuevo in biblioteca:
        similitud = SequenceMatcher(
            None,
            viejo.nombre.casefold(),
            nuevo.nombre.casefold()
        ).ratio()

        candidatos.append((similitud, nuevo))

    candidatos.sort(key=lambda elemento: elemento[0], reverse=True)

    print(f"\n{viejo.nombre} [{viejo.grupo_muscular}]")

    for similitud, nuevo in candidatos[:2]:
        print(
            f"  {similitud:.0%} | {nuevo.nombre} "
            f"[{nuevo.grupo}] | ID {nuevo.id}"
        )
