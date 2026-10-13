# Body Rhythm
Body Rhythm es una plataforma web de fitness que permite a los usuarios consultar ejercicios, gestionar rutinas de entrenamiento, acceder a funcionalidades de nutrición y hacer seguimiento de su progreso.

## Tecnologías

- **Frontend:** React y Vite.
- **Backend:** Django y Django REST Framework.
- **Base de datos:** MySQL.
- **Comunicación:** solicitudes HTTP entre el frontend y la API del backend.
- **Configuración de IA:** variable `GEMINI_API_KEY` en el backend.

## Arquitectura del sistema

El frontend presenta la interfaz con la que interactúa el usuario y envía solicitudes HTTP al backend. Django REST Framework procesa las solicitudes, ejecuta la lógica de negocio y accede a MySQL cuando necesita consultar o persistir información. Finalmente, el backend devuelve las respuestas al frontend para mostrarlas en la interfaz.

mermaid
flowchart TD
    U[Usuario] <--> F[Frontend React + Vite]
    F <-->|Solicitudes y respuestas HTTP| API[API Django REST Framework]
    API <--> DB[(Base de datos MySQL)]
API -.-> IA[Servicio de IA Google Gemini]


### Flujo de las solicitudes

1. El usuario interactúa con la aplicación desde el frontend.
2. React envía solicitudes HTTP a los endpoints de la API.
3. Django REST Framework valida y procesa las solicitudes.
4. Cuando corresponde, el backend consulta o actualiza los datos en MySQL.
5. Para las funcionalidades que lo requieren, el backend puede utilizar el servicio de IA configurado.
6. La API devuelve una respuesta que el frontend presenta al usuario.

## Alcance de esta documentación

Este documento describe la arquitectura general de Body Rhythm. No modifica el comportamiento de la aplicación ni sus modelos, vistas, migraciones o funcionalidades.
