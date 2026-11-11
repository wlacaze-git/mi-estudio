# Supabase con el plan FREE — puesta en marcha

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

## Cómo queda el diseño (para implementar)

- **Login**: botón “Entrar con Google” en Perfil/Ajustes. La sesión se guarda y se renueva sola.
- **Datos**: una fila por cuenta en `estados` (JSON con materias, planes, notas, XP, etc.). Se sube con *debounce* (2 s) después de cada cambio.
- **Fotos**: se suben a `fotos/<user_id>/<image_id>.jpg`; el estado guarda solo los ids.
- **Restaurar en otro dispositivo**: al entrar, baja el JSON y las fotos que falten; se cachean en IndexedDB para seguir offline.
- **Sin internet / proyecto pausado**: la app sigue local; muestra “Nube no disponible” y reintenta al volver la conexión o al tocar “Sincronizar”.
- **Conflictos**: gana el último cambio (por `actualizado`), avisando si la nube es más nueva.
- **Privacidad**: bucket privado, RLS por `auth.uid()`, región Europa, registro por invitación (se puede cerrar el signup público).

---

## Lo que falta del lado de la app

1. `js/cloud.js`: cliente de Supabase (CDN, sin build), login/logout, sync y subida de fotos.
2. `js/config.js`: URL + anon key (vacías = todo local como hoy).
3. UI en Perfil: “Entrar con Google”, estado de sincronización, “Sincronizar ahora”.
4. Migración: al entrar por primera vez, subir lo local; al entrar en otro equipo, bajar lo que haya.
5. Tests: modo sin config (no rompe nada) y sync simulado.

---

## Cuando el proyecto esté creado

Pasame:

1. **Project URL** (`https://xxxx.supabase.co`).
2. **anon public key**.

Con eso conecto la app y lo probamos juntos en el iPad.
