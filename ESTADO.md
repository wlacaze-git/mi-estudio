# Estado del proyecto — Mi Estudio / Perla

**Última actualización:** 11 de noviembre de 2026 (mañana).
**App publicada:** <https://wlacaze-git.github.io/mi-estudio/>
**Repo:** <https://github.com/wlacaze-git/mi-estudio> (GitHub Pages, rama `main`).

---

## Próximo paso decidido (11/11): Supabase plan FREE

**Proyecto:** `Maggie_estudio` — <https://ownqsuajfdckytssajiq.supabase.co>
**Código:** `js/config.js` (URL + publishable key), `js/cloud.js` (login, push/pull, fotos), tarjeta “Nube” en Perfil. Supabase JS vendorizado en `vendor/supabase.js`.
**Estado (11/11, mediodía):** ✅ login con Google y sincronización funcionando. La fila de `estados` guarda el JSON del perfil activo (XP, nivel, racha, intentos, materias, preguntas y estadísticas, planes/exámenes con fechas y temas, notas, horario, chats de Perla, ajustes) y el bucket `fotos` guarda las imágenes. Se sincroniza solo a los 3 s de cada cambio; “Guardar ahora” fuerza y “Bajar de la nube” restaura en otro dispositivo.

**Estado (11/11, tarde):** ✅ login con Google, sincronización y **IA de fotos funcionando**. La función `procesar-foto` (Gemini 3.8 Flash) lee la foto del horario y devuelve las clases (con vista previa antes de agregarlas), y lee fotos de apuntes para completar texto + resumen. Incluye reintentos automáticos si Gemini está saturado y mensajes de error claros.

**Siguiente (a elección):**
1. Fotos del plan → temas automáticos.
2. Explicaciones con IA en la pizarra (texto + voz).
3. Generar preguntas para las estaciones a partir de los apuntes.
4. Apple login (requiere Apple Developer, 99 USD/año).
5. Rotar la secret key que se compartió por chat (pendiente de seguridad).

**Falta (bloqueante):**
1. Correr [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor (la tabla `estados` no existe todavía).
2. Activar el proveedor **Google** en Supabase (Client ID/Secret de Google Cloud).
3. Probar login + “Guardar ahora” + “Bajar de la nube” en el iPad.

**Seguridad:** la secret key que se compartió por chat hay que **revocarla/rotarla** en Supabase; la app solo usa la publishable key.

---

## Novedades del 11/11

Hecho en esta tanda:

- **15 colores** para las materias.
- **Elegir animales por nivel** desde Perfil (intercambia si se repite) y **foto propia como personaje** desde el nivel 8.
- **My Perla con varios chats**: nuevo chat, historial y contexto por conversación.
- **Recordatorios en Hoy**: próximos 7 días con tareas marcables y exámenes/tests de todas las materias.
- **Barra inferior en el teléfono** (iPad y computadora mantienen las pestañas de arriba).
- **Pizarra + lectura en voz alta** en cada estación (voz del dispositivo).

Pendiente de información/definición (guardado para revisar juntos):

- **Importar el horario desde una foto**: hace falta IA (API key o backend) para leer la imagen; hoy queda la foto y la importación por texto.
- **Iniciar sesión (Google/Apple) y sincronizar**: requiere backend, cuentas de desarrollador y definir proveedor.
- **Animales nuevos**: la app trae 8 dibujados; si quieren otros (unicornio, etc.) hay que ilustrarlos.
- **Explicaciones generadas con IA** (a partir de fotos o preguntas): misma dependencia de IA; la pizarra ya lee los apuntes existentes.

---

## Lo que ya está hecho

- **Identidad**: rosa claro, logo de **Perla** (el guepardo rosa) en el ícono de la app y en la barra.
- **Hoy**: saludo con nombre, nivel/XP, racha, próximo examen/test, **“Para hoy”** (planes del calendario con fecha de hoy + tareas de repaso) y “Hoy en el cole”.
- **My Perla**: chat con adjuntos (fotos, apuntes, links de YouTube), respuestas con los datos reales, panel **Mis notas** con promedio y **preguntas de notas** al entrar si hay exámenes pasados sin nota. No tiene IA generativa todavía (ver pendientes).
- **Planes**: sección propia. Cada plan es un **camino con estaciones**:
  - una estación por tema y por día,
  - cada estación arranca con la **lección** (apunte del tema + fotos) y sigue con **12 preguntas**,
  - al completarla guarda puntaje y marca la tarea del día,
  - la última estación es el **repaso general**.
- **Calendario**: vista mensual con exámenes/tests, detalle por día, exportación `.ics` con avisos 2 días antes y la víspera.
- **Horario**: solo lunes a viernes, materia + hora + profesor/a, alta de **materia nueva** desde el formulario, **foto del horario** guardada y **“Importar texto”** (crea materias que faltan).
- **Materias / Apuntes**: preguntas de multiple choice (2–6 opciones, explicación), tarjetas, apuntes con **fotos** (cámara o galería, comprimidas).
- **Práctica**: examen simulado, tarjetas, repasar falladas.
- **Perfil**: nivel, XP, racha, 12 logros, **avatar animal rosa** que evoluciona (caracol → gato → perro → conejo → zorro → jirafa → león → guepardo), **personas** separadas en el mismo iPad.
- **Datos**: todo local (localStorage + IndexedDB para fotos), backup `.json` con fotos, funciona sin internet (service worker).

---

## Cómo retomar mañana

1. Abrir el proyecto y revisar que la app publicada siga en <https://wlacaze-git.github.io/mi-estudio/>.
2. Probar en el iPad: **borrar y volver a agregar el ícono** para ver el logo nuevo.
3. Elegir el próximo paso de la lista de pendientes (abajo).

Para cambios: editar los archivos, correr los tests y publicar:

```bash
node .dev/test.mjs          # 133 chequeos (necesita jsdom en .dev)
node .dev/migrate-test.mjs  # migración de datos viejos
node .dev/cdp.mjs           # 59 chequeos en Chrome real (requiere servidor local)
git add -A && git commit -m "..." && git push
```

El deploy es automático: GitHub Pages sirve `main` en ~1 minuto. Si cambian archivos cacheados, subir el número de `CACHE` en `sw.js` (ahora `v16`).

---

## Pendientes / próximos pasos (prioridad sugerida)

1. **Conectar una IA real a Perla** (lo más pedido): hoy responde con datos pero no charla libre ni lee fotos.
   - Opción A: API key del usuario (OpenAI/Gemini) guardada en Ajustes y llamada desde el navegador.
   - Opción B: un backend chico que guarde la key.
   - Con eso también se podría **leer la foto del horario** y generar preguntas/explicaciones.
2. **Más banco de preguntas**: hoy el demo tiene 5 por materia; las estaciones de 12 repiten. Cargar 10–15 por materia hace el camino más variado.
3. **Explicaciones por tema sin IA**: se pueden escribir como apuntes (la estación ya los usa como lección).
4. **App Store** (opcional): requiere Apple Developer (99 USD/año), envoltorio nativo (Capacitor) y revisión. La PWA ya cubre ícono, pantalla completa y offline.
5. **Notificaciones push** reales: necesitan backend y app instalada.
6. **Compartir** un apunte/quiz con un link: necesita backend.
7. Detalles de pulido: más preguntas de demo, revisar textos con la familia, sonidos/animaciones de recompensa.

---

## Decisiones y datos útiles

- **Estética**: rosa claro (nada de fucsia), animal print rosa en el ícono viejo → ahora logo Perla. Tipografía del sistema.
- **Logo**: `assets/perla.png` (original) → `tools/make_icons.py` genera `icons/icon-*.png` y `icons/logo-perla.png`.
- **Personas**: cada una tiene su espacio (clave `miEstudio.v1.<id>`); registro en `miEstudio.profiles`.
- **Fotos**: IndexedDB (`miEstudio` / store `images`); los apuntes y planes guardan solo los ids.
- **Backup**: incluye fotos en base64; la importación las restaura.
- **Tests**: `.dev/test.mjs` (jsdom), `.dev/migrate-test.mjs`, `.dev/cdp.mjs` (Chrome por CDP). No son parte de la app publicada.
- **Cuenta de publicación**: GitHub `wlacaze-git` (gh autenticado en esta máquina).

---

## Preguntas para definir con la familia

- ¿Quieren conectar una IA paga (cuál) o seguimos con Perla “de datos” por ahora?
- ¿Qué materias y fechas reales cargamos primero? (podemos cargar el contenido inicial juntos).
- ¿La app queda solo para Maggie o sumamos más personas?
- ¿Vale la pena la App Store o alcanza con el link instalado?
