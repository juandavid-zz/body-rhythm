# Despliegue de Body Rhythm

Todo con planes gratis:

| Pieza | Servicio | Para qué |
|---|---|---|
| Frontend (React) | **Vercel** | La página que ve la gente |
| Backend (Django) | **Render** | La API |
| Base de datos | **Aiven** (MySQL) | Los datos |
| Fotos de perfil | **La base de datos** | El disco de Render se borra al reiniciar (Cloudinary es opcional) |
| Correos | **Brevo** | Render gratis bloquea el SMTP de Gmail |
| IA | **Google AI Studio** (Gemini) | Chatbot y rutinas |
| Pagos | **Wompi** (modo de pruebas) | Planes Pro y Premium |

Orden recomendado: primero las cuentas (pasos 1 a 4), luego Render (5), luego
Vercel (6) y al final se conectan los dos (7).

---

## 1. Base de datos en Aiven

1. Entra a <https://console.aiven.io>, crea una cuenta y un servicio **MySQL**
   con el plan **Free**.
2. Cuando esté en *Running*, en **Overview** copia: *Host*, *Port*, *User*
   (`avnadmin`), *Password* y *Database name* (`defaultdb`).
3. Descarga el **CA certificate** (archivo `ca.pem`). Lo vas a subir a Render.

> La base empieza vacía. Las tablas se crean solas al desplegar, y también la
> biblioteca de 376 ejercicios y el catálogo de alimentos. Los usuarios de tu
> base local **no** se pasan.

## 2. Fotos en Cloudinary

1. Crea una cuenta en <https://cloudinary.com> (plan Free).
2. En el **Dashboard** copia el *API environment variable*. Se ve así:
   `cloudinary://123456789:abcDEF...@tu-nube`. Ese es `CLOUDINARY_URL`.

## 3. Correos con Brevo

1. Crea una cuenta en <https://www.brevo.com> (plan Free, 300 correos al día).
2. En **Senders, Domains & Dedicated IPs → Senders**, agrega tu correo (puede
   ser un Gmail) y confírmalo con el enlace que te llega.
3. En **SMTP & API → API Keys**, crea una clave. Es `BREVO_API_KEY`.
4. `DEFAULT_FROM_EMAIL` es ese correo verificado, por ejemplo
   `Body Rhythm <tucorreo@gmail.com>`.

## 4. Gemini y Wompi

- **Gemini:** en <https://aistudio.google.com/apikey> crea una clave
  (`GEMINI_API_KEY`). La app usa Flash-Lite, que tiene el cupo gratis más grande.
- **Wompi (pruebas):** en el panel de Wompi, en modo **Sandbox**, copia la llave
  pública, la privada, el secreto de integridad y el de eventos. Las llaves de
  prueba empiezan por `pub_test_` y `prv_test_`.

## 5. Backend en Render

1. En <https://dashboard.render.com> entra con GitHub y elige
   **New → Blueprint**. Escoge el repositorio `body-rhythm`. Render lee el archivo
   `render.yaml` y crea el servicio `body-rhythm-api`.
2. Te va a pedir las variables. Llénalas así:

   | Variable | Valor |
   |---|---|
   | `SECRET_KEY` | Una clave larga. Genérala con: `python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"` |
   | `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Los de Aiven (paso 1) |
   | `CORS_ALLOWED_ORIGINS` | Por ahora `https://localhost`. Se cambia en el paso 7 |
   | `CSRF_TRUSTED_ORIGINS` | Igual, se cambia en el paso 7 |
   | `FRONTEND_URL` | Igual, se cambia en el paso 7 |
   | `GEMINI_API_KEY` | Paso 4 |
   | `CLOUDINARY_URL` | Paso 2 |
   | `BREVO_API_KEY`, `DEFAULT_FROM_EMAIL` | Paso 3 |
   | `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET` | Paso 4 |

3. En el servicio, entra a **Environment → Secret Files** y agrega un archivo
   llamado `ca.pem` con el contenido del certificado de Aiven. Render lo deja en
   `/etc/secrets/ca.pem`, que es la ruta que ya trae `DB_SSL_CA`.
4. Espera a que el despliegue termine. Al arrancar se crean las tablas y se carga
   la biblioteca de ejercicios. Abre `https://body-rhythm-api.onrender.com/api/salud/`
   (con el nombre que te haya dado Render): debe responder `{"ok": true}`.

> El plan gratis de Render se apaga tras 15 minutos sin visitas. La primera
> visita después de eso tarda cerca de un minuto en responder; las siguientes son
> normales.

## 6. Frontend en Vercel

1. En <https://vercel.com> entra con GitHub, elige **Add New → Project** y el
   repositorio `body-rhythm`.
2. En **Root Directory** pon `frontend`. Vercel detecta Vite solo (el archivo
   `frontend/vercel.json` ya trae la configuración).
3. En **Environment Variables** agrega `VITE_API_URL` con la dirección de Render,
   **sin** `/api` al final. Ejemplo: `https://body-rhythm-api.onrender.com`.
4. Despliega. Te queda una dirección como `https://body-rhythm.vercel.app`.

## 7. Conectar los dos

1. En Render, cambia estas variables por la dirección de Vercel (con `https://` y
   sin `/` al final). Render se redespliega solo:
   - `CORS_ALLOWED_ORIGINS=https://body-rhythm.vercel.app`
   - `CSRF_TRUSTED_ORIGINS=https://body-rhythm.vercel.app`
   - `FRONTEND_URL=https://body-rhythm.vercel.app`
2. En el panel de Wompi (Sandbox), en **URL de eventos**, pon
   `https://body-rhythm-api.onrender.com/api/pagos/webhook/`.
3. Prueba todo: crea una cuenta (te debe llegar el correo de Brevo), sube una
   foto de perfil, arma una rutina con el chatbot y haz un pago de prueba con las
   tarjetas de prueba de Wompi.

## Administrador

Render gratis no tiene consola. Para crear el usuario administrador, desde tu
computador apunta temporalmente el `backend/.env` a la base de Aiven (los mismos
`DB_*` y `DB_SSL_CA` con la ruta a tu `ca.pem`) y corre:

```bash
python manage.py createsuperuser
```

Después vuelve a dejar el `.env` con tu base local.

## Después de desplegar

- **HSTS:** cuando confirmes que todo funciona por HTTPS, en Render pon
  `SECURE_HSTS_SECONDS=31536000`.
- **Animaciones cambiadas:** si vuelves a generar animaciones con el mismo nombre,
  sube `VERSION` en `frontend/public/sw.js`. Así la app instalada no se queda con
  las viejas.
- **Más cupo de IA:** si activas la facturación en Google AI Studio, en Render pon
  `GEMINI_MODELO_CHAT=gemini-flash-latest` para que el chat use Flash.
