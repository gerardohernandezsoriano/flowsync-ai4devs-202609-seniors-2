# Design

## Context

La capability `tasks` ya existe (spec viva en `openspec/specs/tasks/`): API de listar, crear y actualizar, y la pantalla `/tasks`. La representación de una tarea la construye un transformer y hoy no lleva ninguna fecha (restricción del change anterior, que este levanta solo para `dueDate`). La lista pide las tareas con `lib/api.ts`, único punto de contacto con el backend. Motivación y alcance en `proposal.md`; requisitos en `specs/tasks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Que el servidor sea la única fuente del veredicto de vencimiento, calculado en cada lectura y relativo al día del cliente.
- Una superficie mínima (lectura individual y página `/tasks/:id`) para poner, quitar y ver el vencimiento de una tarea.

**Non-Goals:**
- Pantalla de detalle completa, edición de título, responsable o estado en la página nueva.
- Ordenar o filtrar por fecha, notificaciones, recordatorios, recurrencia, jobs nocturnos.
- Tests y dependencias nuevas.

## Decisions

**Persistencia.** Migración `add_due_date_to_tasks` que añade `due_date` de tipo `date`, nulable; el reverso la elimina. Las tareas existentes quedan con `null`, que es un estado válido (sin fecha). No hay ninguna columna para `isOverdue` (restricción 3). `database/schema.ts` se regenera con `node ace migration:run`, no se edita a mano.

**La regla vive en el modelo de tarea, una sola vez.** Un método `isOverdueOn(today)` en el modelo de tarea devuelve `true` solo si hay fecha, `fecha < today` y el estado no es `done`. Se compara el **texto de calendario** (`toISODate()` de la fecha frente al `today` ya normalizado a `YYYY-MM-DD`), nunca instantes ni horas: así no hay deriva por huso horario del servidor y «hoy» queda exactamente en el lado de «no vencida». Ninguna otra capa reimplementa la regla; el frontend solo lee `isOverdue`.

**Día de referencia.** Un validador del parámetro de query `today` (`vine.date` con formato `YYYY-MM-DD`, opcional) y un resolutor que devuelve `today` normalizado o, si falta, el día UTC del servidor. Se aplica en las cuatro operaciones (listar, leer, crear, actualizar) para que cualquier `isOverdue` devuelto sea del día de quien mira. `today` mal formado da 422 sobre `today`. Se descartó hacerlo obligatorio: rompería a cualquier cliente que no lo mande y la lista actual no lo necesita para pintarse. El frontend lo manda siempre. Antes de escribir, comprobar en los `.d.ts` de VineJS que el formato es estricto (que `2026-2-3` o `2026-02-30` se rechazan) y cómo se valida la query con `validateUsing`.

**Validar `dueDate`.** `vine.date` con formato `YYYY-MM-DD`, nulable y opcional; **sin** regla de «no anterior a hoy» (restricción 4). Distinguir ausente de `null` es esencial: ausente deja la fecha como está, `null` la quita. La cadena vacía se normaliza a `null` antes de validar (sin ella, el `vine.date` la rechazaría). La conversión global de fechas a Luxon ya existe en `start/validator.ts`.

**Actualización: «al menos un campo».** Hoy se logra con `requiredIfMissing` cruzado entre `status` y `assigneeId`. Con `dueDate` no vale: `requiredIfMissing` trata `null` como ausente, y `{ "dueDate": null }` (quitar la fecha) quedaría rechazado. Se sustituye por una condición `requiredWhen` con callback sobre `status` que exige alguno de los tres solo cuando ninguno de los tres viene definido (distinguiendo `undefined` de `null`), de modo que el error sigue saliendo sobre un campo, con el mismo formato. Comprobar en los `.d.ts` que `field.parent` expone los datos crudos; si no, mover la comprobación al controlador con el mismo formato de error. En la actualización solo se tocan los campos presentes.

**`isOverdue` y `title` se ignoran por construcción.** Los validadores descartan los campos desconocidos, que es lo que piden los escenarios; no hay código específico para ignorar `isOverdue`. `{ "isOverdue": true }` a solas cae en «nada que actualizar» y da 422.

**Representación.** El transformer de tarea pasa a recibir el día de referencia como segundo argumento del constructor (el transformer base admite parámetros extra) y devuelve `id`, `title`, `status`, `assignee: { fullName }`, `dueDate` (`toISODate()` o `null`) e `isOverdue`. Sigue sin exponer email, id de usuario ni marcas de creación o modificación. La misma representación sirve a listar, leer, crear y actualizar.

**Lectura individual.** `GET /api/v1/tasks/:id` con `index` ya existente como referencia: una consulta por id con el responsable cargado y `firstOrFail` (404). Es la superficie mínima que necesita «abrir la tarea» sin construir el detalle completo, y devuelve la misma representación que la lista. Punto abierto, recogido en el proposal: cuando exista la pantalla de detalle completa, qué campos más devuelve y dónde. `DELETE` y las rutas de equipo siguen sin existir.

**Crear con fecha.** El validador de creación admite un `dueDate` opcional y nulable. El formulario de la pantalla no lo ofrece (CA-1); solo la API lo acepta.

**Frontend: capa de API.** En `lib/types.ts`, `Task` gana `dueDate: string | null` e `isOverdue: boolean`. En `lib/api.ts`, un ayudante calcula el día local con los componentes de la fecha local (`getFullYear`, `getMonth`, `getDate`), **no** con `toISOString()`, que da el día UTC y reproduciría justo el fallo que se quiere evitar; todas las llamadas de tareas añaden `?today=`. Se añaden `getTask` y se amplía `updateTask` para aceptar `status` y/o `dueDate` (incluido `null`). La traducción de errores gana mensajes en castellano para `dueDate` («Esa fecha no es válida.») y para `today`.

**Frontend: página `/tasks/:id`.** Nueva `pages/task-page.tsx`, ruta protegida, con el mismo marco visual que la lista y el perfil (`Card`, `Button`, `Input`, `Label`, `Alert`; sin componentes nuevos). Contenido: título como encabezado, un `Input` de tipo `date` con su `Label`, un botón «Quitar fecha» y la señal «Vencida» (icono de `lucide-react` más texto, con el color del destructivo solo como refuerzo), y un enlace de vuelta a la lista. No muestra responsable ni estado.
- **Guardado automático.** Cada cambio completo y válido se guarda al instante, sin botón ni confirmación; quitar la fecha tampoco confirma.
- **Fecha incompleta o imposible.** El `input` nativo de fecha devuelve vacío tanto si se borra como si queda a medias; para no confundirlos se mira `validity.badInput`: si está activo se muestra el error junto al campo y **no** se guarda nada, de modo que se conserva la fecha previa; solo un vacío sin `badInput` equivale a quitar. El campo es **no controlado** (con referencia), porque un campo controlado reinicia lo que la persona está tecleando a medias en cuanto el estado no cambia.
- **El veredicto no se calcula en el cliente.** La fecha se ve al instante porque el propio campo ya la muestra; la señal de «Vencida» aparece o desaparece cuando llega la respuesta, que trae el `isOverdue` del servidor. Si el guardado falla, el campo vuelve a la fecha anterior y se avisa. Una respuesta tardía de un guardado ya superado se descarta con un contador de peticiones.
- **Tarea inexistente.** El 404 se pinta como aviso con enlace a la lista.
- **Teclado y accesibilidad.** Todo es operable con teclado (campo y botón nativos) y la señal no depende solo del color.

**Frontend: lista y rutas.** En la lista, el título de cada fila pasa a ser un enlace a `/tasks/:id`; la fila no muestra fecha ni marca (restricción 6) y el formulario de creación no cambia. Se registra `/tasks/:id` dentro de la ruta protegida.

**Documentación.** La tabla de rutas de `CLAUDE.md` no recoge las de tareas, que el change anterior dejó sin documentar; se añaden todas, incluida la lectura individual.

## Risks / Trade-offs

- [El huso: sin `today` el veredicto es del día UTC del servidor] → El cliente web lo manda siempre; se acepta que otros clientes reciban el veredicto UTC. Anotado como punto abierto.
- [`vine.date` puede aceptar formatos laxos] → Comprobar los casos `2026-2-3`, `2026-02-30`, `2026-10` y con hora al verificar la API; si hace falta, añadir una validación estricta del texto antes de convertir.
- [`requiredWhen` con callback es más delicado que `requiredIfMissing`] → Verificar a mano los cuerpos `{}`, `{ "dueDate": null }`, `{ "dueDate": "" }`, `{ "isOverdue": true }` y las combinaciones; plan B en el controlador, descrito arriba.
- [El campo de fecha nativo se ve distinto en cada navegador] → Aceptado: es lo que ya admite el proyecto, sin dependencia nueva, y la entrada válida siempre llega como `YYYY-MM-DD`.
- [Volver de «Hecho» con fecha pasada devuelve la tarea a vencida] → Es lo que sale de la regla calculada en cada lectura (PA-7); anotado como punto abierto.
- [Ediciones simultáneas de la fecha] → Gana la última escritura, sin aviso (PA-8).
- [El árbol de trabajo puede traer cambios previos sin commitear en `backend/database/schema.ts` y en los `package*.json` del backend, y la base local tiene una migración marcada como corrupta] → Revisar el estado antes de `migration:run` y no incluir esos cambios previos en los commits de este change; la regeneración de `schema.ts` se commitea solo con lo propio de este change.
