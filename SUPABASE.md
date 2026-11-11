# Supabase con el plan FREE — puesta en marcha

**Proyecto creado:** `Maggie_estudio`
**URL:** <https://ownqsuajfdckytssajiq.supabase.co>
**Publishable key:** ya está cargada en [`js/config.js`](js/config.js) (es pública; la secreta **no** va en la app).

**Estado:** código de conexión listo (login Google, guardar/bajar datos y fotos). Faltan dos cosas del lado de Supabase: **correr el SQL** y **activar Google**. La tabla `estados` todavía no existe (verificado: responde `PGRST205`).

Decisión: usamos **Supabase Free** para cuentas (Google), sincronización y fotos.
La app sigue funcionando **local-first**: si Supabase está pausado o sin internet, se puede estudiar igual y sincroniza después.

---

## Qué alcanza el plan FREE

| Recurso | Free | Para este caso |
| --- | --- | --- |
| Base de datos | 500 MB | El estado de la app es un JSON de pocos KB: sobra. |
| Storage | 1 GB | ~5.000 fotos comprimidas (~200 KB): un año de apuntes entra. |
| Egress | 5 GB/mes | De sobra para una familia. |
| Usuarios | 50.000 | — |
| **Pausa** | Sí, tras **7 días sin actividad** | Hay que reactivar el proyecto desde el panel. Los datos **no se pierden**. |

No hay backups automáticos en Free: la app ya exporta un **backup `.json`** con fotos; conviene descargarlo de vez en cuando.

---

## Pasos (10 minutos, una sola vez)

### 1. Crear el proyecto

1. Entrar a <https://supabase.com> → **Start your project** (con la cuenta de Google o GitHub).
2. **New project**:
   - Name: `mi-estudio`
   - Database password: una segura (guardarla).
   - Region: **Frankfurt (eu-central-1)** (Europa, por los datos de Maggie).
3. Esperar 1–2 minutos a que termine de crearse.

### 2. Crear las tablas y el bucket

1. En el menú: **SQL Editor** → **New query**.
2. Pegar **todo** el contenido de [`supabase/schema.sql`](schema.sql).
3. **Run**. Tiene que decir *Success*.

### 3. Activar “Entrar con Google”

1. **Authentication → Providers → Google** → activar.
2. Pide **Client ID** y **Client Secret** de Google:
   1. Ir a <https://console.cloud.google.com/apis/credentials>.
   2. **Create credentials → OAuth client ID → Web application**.
   3. **Authorized JavaScript origins**: `https://wlacaze-git.github.io`
   4. **Authorized redirect URIs**: `https://<TU-PROYECTO>.supabase.co/auth/v1/callback`
   5. Copiar Client ID y Client Secret y pegarlos en Supabase → **Save**.

### 4. Configurar las URLs de la app

**Authentication → URL Configuration**:

- **Site URL**: `https://wlacaze-git.github.io/mi-estudio/`
- **Redirect URLs**: agregar `https://wlacaze-git.github.io/mi-estudio/`

### 5. Copiar los datos que necesita la app

**Project Settings → API**:

- **Project URL**: `https://<TU-PROYECTO>.supabase.co`
- **anon public key**: la clave pública (no es secreta; las reglas RLS protegen los datos).

Esos dos datos son los que hay que pasarle al proyecto para conectar la app.

---

## Arquitectura completa (10 personas, todo en Free)

```
iPad / compu
   │  (1) login Google / Apple
   ▼
Supabase Auth  ──────────────►  Postgres (estado, apuntes, resúmenes, preguntas)
   │                                   ▲
   │  (2) foto                         │ (4) texto + resumen
   ▼                                   │
Supabase Storage (bucket privado)      │
   │                                   │
   │  (3) Edge Function ──► Gemini API (clave secreta)
   ▼
respuesta JSON: texto, temas, resumen, preguntas
```

- **Datos**: el estado de la app (materias, planes, notas, XP) se guarda como JSON por cuenta en Postgres. Con 10 personas son unos pocos MB: el límite de 500 MB sobra.
- **Fotos**: se suben comprimidas (~200 KB) a `fotos/<user_id>/...`. 1 GB alcanza para ~5.000 fotos. Si querés ahorrar, después del OCR se puede borrar el original y guardar solo el texto y una miniatura.
- **IA**: la Edge Function guarda la clave de Gemini como *secret* (nunca en la app), recibe la foto, pide el texto y el resumen, y devuelve JSON. El plan Free incluye **500.000 invocaciones/mes** ([precios](https://supabase.com/docs/guides/functions/pricing)): con 10 personas sobra.
- **Resúmenes y preguntas**: se guardan en el mismo estado o en tablas `resumenes` / `preguntas`. Sirven para las estaciones (12 preguntas/día) y para “explicame este tema”.

### Números para 10 personas

| Concepto | Uso estimado | Límite Free |
| --- | --- | --- |
| Base | < 5 MB | 500 MB |
| Fotos | ~50 MB/año | 1 GB |
| Invocaciones IA | ~1.000/mes | 500.000/mes |
| Usuarios | 10 | 50.000 |
| Egress | < 5 GB/mes | 5 GB/mes |

### Apple: sí, pero con requisitos

- Requiere **Apple Developer** (99 USD/año) y crear un **Services ID** + clave `.p8`.
- En Supabase se activa el proveedor Apple con Team ID, Key ID, Services ID y la clave.
- **Mantenimiento**: Apple exige **rotar el secret cada 6 meses**; si no, el login deja de funcionar ([documentación](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)).
- Si no querés pagar eso ahora, se puede arrancar **solo con Google** y sumar Apple después; la app queda igual.

---

## Cómo queda el diseño (para implementar)

- **Login**: botón “Entrar con Google” en Perfil/Ajustes. La sesión se guarda y se renueva sola.
- **Datos**: una fila por cuenta en `estados` (JSON con materias, planes, notas, XP, etc.). Se sube con *debounce* (2 s) después de cada cambio.
- **Fotos**: se suben a `fotos/<user_id>/<image_id>.jpg`; el estado guarda solo los ids.
- **Restaurar en otro dispositivo**: al entrar, baja el JSON y las fotos que falten; se cachean en IndexedDB para seguir offline.
- **Sin internet / proyecto pausado**: la app sigue local; muestra “Nube no disponible” y reintenta al volver la conexión o al tocar “Sincronizar”.
- **Conflictos**: gana el último cambio (por `actualizado`), avisando si la nube es más nueva.
- **Privacidad**: bucket privado, RLS por `auth.uid()`, región Europa, registro por invitación (se puede cerrar el signup público).

---

## IA con Gemini (fotos → texto, resumen y preguntas)

La app ya tiene los botones **“Leer con IA”** en la foto del horario y en el formulario de apuntes. Falta publicar la función y cargar la clave.

### 1. Sacar la API key de Gemini (gratis)

1. Entrar a <https://aistudio.google.com/apikey>.
2. **Create API key** → elegir el proyecto → copiar la clave (`AIza...`).

### 2. Guardarla como secreto en Supabase

1. Supabase → **Edge Functions → Secrets** (o **Project Settings → Edge Functions**).
2. **Add new secret**: nombre `GEMINI_API_KEY`, valor la clave.
3. Guardar. Opcional: `GEMINI_MODEL` = `gemini-2.5-flash` (si querés otro modelo).

### 3. Publicar la función

1. Supabase → **Edge Functions → Create function**.
2. Nombre: **`procesar-foto`** (exacto).
3. Pegar el contenido de [`supabase/functions/procesar-foto/index.ts`](supabase/functions/procesar-foto/index.ts).
4. Dejar **Verify JWT** activado (la app manda el token del usuario).
5. **Deploy**.

### 4. Probar

- **Horario**: subir la foto y tocar **“Leer con IA”** → muestra las clases leídas → **Agregar**.
- **Apuntes**: agregar una foto y tocar **“Leer la foto con IA”** → completa el texto y el resumen.
- Si falta la clave o la función, la app muestra el error exacto.

Con 10 personas, la cuota gratuita de Gemini y las 500.000 invocaciones de Edge Functions sobran. Si Gemini limita por minuto, la app avisa para reintentar.

---

## Lo que falta del lado de la app

1. `js/cloud.js`: cliente de Supabase (CDN, sin build), login/logout, sync y subida de fotos.
2. `js/config.js`: URL + anon key (vacías = todo local como hoy).
3. UI en Perfil: “Entrar con Google” (y “Entrar con Apple” si está configurado), estado de sincronización, “Sincronizar ahora”.
4. `supabase/functions/procesar-foto`: Edge Function que recibe la imagen, llama a Gemini y devuelve texto + resumen + preguntas.
5. Migración: al entrar por primera vez, subir lo local; al entrar en otro equipo, bajar lo que haya.
6. Tests: modo sin config (no rompe nada) y sync simulado.

### Variables secretas de la Edge Function

- `GEMINI_API_KEY` (secreta, se carga en Supabase → Edge Functions → Secrets).
- La `anon key` va en la app (es pública); la `service_role` **nunca** va en la app.

---

## Cuando el proyecto esté creado

Pasame:

1. **Project URL** (`https://xxxx.supabase.co`).
2. **anon public key**.

Con eso conecto la app y lo probamos juntos en el iPad.
