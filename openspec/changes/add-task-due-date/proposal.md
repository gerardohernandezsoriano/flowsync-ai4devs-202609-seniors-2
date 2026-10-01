# Proposal

## Why

Hoy una tarea no puede comprometerse con una fecha, y nadie se entera de que se ha pasado de plazo hasta que alguien lo pregunta. FS-118 (RF-13, RF-14, RF-15) pide poner, cambiar y quitar una fecha de vencimiento y que el sistema diga, sin cálculo mental, cuándo una tarea está vencida.

## What Changes

- La tarea gana una **fecha de vencimiento opcional**, de calendario y sin hora (`YYYY-MM-DD`). Se puede poner al crear y al actualizar, cambiar y quitar; quitarla es enviarla explícitamente vacía (`null` o cadena vacía). Una fecha anterior a hoy se **acepta** y la tarea nace o pasa a estar vencida; una fecha que no existe o está incompleta se rechaza con 422 sobre `dueDate`.
- La representación de una tarea en la API añade `dueDate` (texto o `null`) e **`isOverdue`** (booleano). El veredicto lo da **el backend**: una tarea está vencida si tiene fecha, esa fecha es **anterior** a hoy y su estado **no** es `done`. Una tarea con fecha de hoy aún no está vencida.
- `isOverdue` **no se persiste** ni se actualiza con ningún proceso: se calcula en cada lectura. El cliente no puede enviarlo; si lo envía, se ignora.
- «Hoy» es el día de quien mira: el cliente lo manda en el parámetro de query opcional `today` (`YYYY-MM-DD`) y el servidor devuelve el veredicto de ese día. Sin `today`, el servidor usa su propia fecha (UTC); con un `today` mal formado, 422.
- Nueva operación de API: **lectura individual** de una tarea (`GET /api/v1/tasks/:id`), la superficie mínima que la historia necesita para «abrir la tarea». Sigue sin haber borrado ni endpoints de equipo.
- Nueva **página mínima `/tasks/:id`**, enlazada desde el título de cada fila de la lista: título de la tarea, selector de fecha con acción de quitarla, guardado automático sin botón ni confirmación, errores junto al campo y una señal propia de «Vencida» (icono y texto, no solo color). No muestra ni edita responsable, estado ni título: la pantalla de detalle completa **no** entra.
- La **lista no cambia lo que muestra**: título, responsable y estado, sin fecha ni marca de vencida. El único cambio visible es que el título pasa a ser un enlace a la página de la tarea. El formulario de creación sigue pidiendo solo el título.
- Reutiliza los componentes de `frontend/src/components/ui/` y el patrón de páginas y rutas existente. Sin dependencias nuevas y **sin tests**.
- Fuera de alcance: notificaciones, recordatorios, recurrencia, ordenar o filtrar por fecha, y tests de cualquier tipo.

### Puntos abiertos

- **Forma de la lectura individual.** Hoy devuelve la misma representación mínima que la lista. Cuando exista la pantalla de detalle completa (PA-6 del PRD), probablemente necesitará más campos y habrá que decidir si crecen en esta operación o en otra; este change no lo decide.
- **Volver de «Hecho» a un estado anterior con la fecha pasada (PA-7).** La regla se calcula en cada lectura, así que una tarea que sale de `done` con fecha pasada vuelve a estar vencida sin más; queda por confirmar que ese es el comportamiento deseado de producto.
- **Dos personas editando la fecha a la vez (PA-8).** Gana la última escritura, sin aviso a quien pierde.
- **Veredicto sin `today`.** Quien no envíe `today` recibe el veredicto del día UTC del servidor, que para una persona en otro huso puede diferir del suyo. El cliente web lo envía siempre; no se endurece a obligatorio para no romper a otros clientes.
- **Orden de la lista (PA-3)** sigue abierto como en `add-task-list`; este change no ordena ni filtra por fecha.

## Capabilities

### New Capabilities

(Ninguna.)

### Modified Capabilities
- `tasks`: la tarea gana fecha de vencimiento y el campo `isOverdue`; se añaden la lectura individual y la página mínima de la tarea; cambian los requisitos de listado (ya expone `dueDate` e `isOverdue`), de sesión, de actualización y del conjunto cerrado de operaciones (ahora incluye la lectura individual).

## Impact

- **Backend (`backend/`):** nueva migración que añade `due_date` a `tasks`; regla de vencimiento en el modelo de tarea; validadores de creación y actualización ampliados y un validador del día de referencia; transformer con el día de referencia; ruta nueva `GET /api/v1/tasks/:id` y métodos `show`, `index`, `store`, `update` ajustados; se regeneran `database/schema.ts` y `.adonisjs/`.
- **Frontend (`frontend/`):** `lib/api.ts` (lectura individual, `dueDate` en la actualización, envío del día local), tipos de tarea, nueva página `/tasks/:id`, enlace desde la lista y ruta protegida nueva.
- **Documentación:** la tabla de rutas de `CLAUDE.md` gana las rutas de tareas, que el change anterior dejó sin documentar.
- **Dependencias:** ninguna. **Tests:** ninguno. **Datos:** las tareas existentes quedan sin fecha.
