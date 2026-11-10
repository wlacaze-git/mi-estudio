# Estado del proyecto — Mi Estudio / Perla

**Última actualización:** 10 de noviembre de 2026 (noche).
**App publicada:** <https://wlacaze-git.github.io/mi-estudio/>
**Repo:** <https://github.com/wlacaze-git/mi-estudio> (GitHub Pages, rama `main`).

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
node .dev/test.mjs          # 118 chequeos (necesita jsdom en .dev)
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
