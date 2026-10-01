# Proposal

## Why

FlowSync existe para responder «¿en qué está cada uno ahora mismo?» sin interrumpir a nadie, y hoy la aplicación solo sabe de cuentas: no hay tareas, ni dónde verlas, ni forma de actualizarlas. Sin una lista compartida no hay producto; es el sustrato del que dependen el resto de historias de las épicas E2 y E3.

## What Changes

- Nueva API de tareas bajo `/api/v1/tasks` con **exactamente tres operaciones**: listar todas, crear una y actualizar una. No hay lectura individual, ni borrado, ni endpoints de equipo.
- Una **única lista compartida**: todas las personas con sesión ven las mismas tareas y cualquiera puede cambiar el estado y el responsable de cualquiera. No hay tareas privadas ni vista «mis tareas».
- Estados cerrados `pending`, `in_progress` y `done` en la API (cualquier otro valor se rechaza con 422), pintados como **Pendiente**, **En curso** y **Hecho**.
- Crear pide **solo el título** (obligatorio, sin espacios sobrantes, máximo 255 caracteres, nunca se recorta en silencio). La tarea nace en `pending` y con quien la crea como responsable.
- Nueva pantalla `/tasks` protegida: lista con título, responsable (por **nombre**; «Sin nombre» si no lo tiene) y estado; formulario de un único campo para crear; selector de estado en cada fila; estado vacío que explica y ofrece crear la primera.
- `/tasks` pasa a ser el destino por defecto de la persona con sesión (tras entrar y en rutas desconocidas), con enlaces entre la lista y el perfil.
- Reutiliza los componentes ya presentes en `frontend/src/components/ui/` y el patrón de páginas y rutas del login. Sin design system nuevo, sin dependencias nuevas.
- **Sin tests** en este change: ni base de pruebas ni ficheros de test.
- Fuera de alcance, deliberadamente: fecha de vencimiento (ni en la tarea, ni en la lista, ni preparada), filtros, refresco automático de la lista (E3-2), presencia de personas conectadas, edición del título y selector de responsable en pantalla.

### Puntos abiertos

- **Orden de la lista (PA-3).** No hay regla decidida. Este change **no ordena explícitamente**: la API devuelve las tareas sin criterio garantizado y la pantalla las pinta en el orden recibido. Sin orden ni agrupación, E3-1 CA-5 («enumerar el trabajo de cada persona») no se sostiene con volumen; hay que decidirlo en un change posterior.
- **Longitud máxima del título (PA-9).** 255 es un valor provisional elegido para poder devolver 422; el umbral real es decisión de producto pendiente.
- **Transiciones de estado (PA-7).** No hay grafo decidido: se permite cualquier transición, también salir de «Hecho», sin confirmación.
- **Destino por defecto vs. spec `auth`.** La spec viva `auth` (PR #62, aún sin fusionar en esta base) dice que login y rutas desconocidas llevan a `/profile`. Este change lo cambia a `/tasks`; al fusionarse #62 hará falta un delta `MODIFIED` sobre `auth` para esos escenarios.
- Fuera de este change y anotados en el backlog: tope de tareas «En curso» por persona (PA-4) y qué ve quien tiene abierta una tarea que cambia de manos (PA-8).

## Capabilities

### New Capabilities
- `tasks`: lista compartida de tareas del equipo, su creación con solo el título, su responsable y estado por defecto, y el cambio de estado y responsable, tanto por API como en pantalla.

### Modified Capabilities

(Ninguna en este change. El cambio de destino por defecto afecta a `auth`; ver puntos abiertos.)

## Impact

- **Backend (`backend/`):** nueva migración y modelo de tareas con relación al usuario responsable, controlador, validadores, transformer y tres rutas autenticadas en `start/routes.ts`; se regenera `database/schema.ts` y `.adonisjs/` (que se commitean).
- **Frontend (`frontend/`):** llamadas nuevas en `lib/api.ts` (único punto de contacto con la API), tipos de tarea, página `/tasks`, ajustes en las rutas (destino por defecto) y enlace desde el perfil.
- **Documentación:** la tabla de rutas de `CLAUDE.md` gana las tres rutas nuevas.
- **Dependencias:** ninguna. **Tests:** ninguno.
