# Design

## Context

La aplicación solo tiene el vertical de cuentas (registro, login, perfil). El backend es AdonisJS 7 con esquema autogenerado desde migraciones, respuestas envueltas en `{ data }` por `serialize()` y transformers; el frontend concentra el acceso a la API en `lib/api.ts` y protege rutas con `ProtectedRoute`. Motivación y alcance en `proposal.md`; requisitos en `specs/tasks/spec.md`.

## Goals / Non-Goals

**Goals:**
- Tres operaciones de API (listar, crear, actualizar) y una página `/tasks`, siguiendo los patrones ya existentes.
- Exponer del responsable solo su nombre: lo que una vista que solo lo pinta necesita.

**Non-Goals:**
- Orden, agrupación, filtros, paginación o refresco automático de la lista.
- Fecha de vencimiento: ni columna, ni campo en la API, ni preparada.
- Tests, dependencias nuevas, componentes de UI nuevos.

## Decisions

**Modelo de datos.** Migración `tasks` con `id`, `title` (string 255, no nulo), `status` (string, no nulo, por defecto `pending`), `assignee_id` (entero no nulo, referencia a `users.id`) y `created_at`/`updated_at` estándar. Sin columna de fecha de vencimiento. `status` es texto validado en la API y no un `CHECK` ni un enum de base de datos: SQLite no soporta enums y la validación vive ya en VineJS. El modelo solo declara la relación `assignee` hacia el usuario (el esquema lo genera `node ace migration:run`). Los timestamps existen en la tabla pero **no se exponen** en la API (restricción 1: la lista no maneja fechas).

**Contrato de la API** (todas bajo `/api/v1/tasks`, en un grupo con `middleware.auth()`):

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/tasks` | — | 200 `{ data: Task[] }` |
| POST | `/tasks` | `{ title }` | 200 `{ data: Task }` |
| PATCH | `/tasks/:id` | `{ status?, assigneeId? }` | 200 `{ data: Task }` |

`Task = { id, title, status, assignee: { fullName: string | null } }`. El código es 200 y no 201 por coherencia con `signup`, que ya responde 200 con `serialize`. `PATCH` y no `PUT` porque la actualización es parcial. No se registran `show` ni `destroy`: el router responde 404 por sí solo.

**Listar sin ordenar.** La consulta carga la relación `assignee` y **no** lleva `orderBy`. Es la forma literal de cumplir la restricción 4; el orden resultante es el que dé la base de datos y no se promete. Esto va contra la promesa de E3-1 CA-5 y está anotado como punto abierto (PA-3).

**Qué se expone del responsable.** Un transformer de tarea con `pick` de `id`, `title`, `status` y un `assignee` que contiene solo `fullName`. No se reutiliza `UserTransformer`, que lleva email, `id` e iniciales y filtraría datos de cuenta a una vista que no los usa (nota de E3-1).

**Validación (VineJS 4, `vine.create`).** Validador de creación: `title` = `vine.string().trim().minLength(1).maxLength(255)`. Un título en blanco queda vacío tras `trim` y falla `minLength`; uno largo falla `maxLength` y nunca se recorta. Los campos desconocidos (`status`, `assigneeId` al crear; `title` al actualizar) se descartan por defecto, que es exactamente lo que piden los escenarios. Validador de actualización: `status = vine.enum(['pending','in_progress','done']).optional()` y `assigneeId` numérico con regla `exists` sobre `users.id`, ambos `optional()` y `requiredIfMissing` del otro, para que un cuerpo vacío dé 422. Antes de escribirlo, confirmar las firmas en los `.d.ts` de `node_modules/@vinejs/vine` y de Lucid (versiones por delante de la documentación conocida).

**Crear.** El controlador fija `assigneeId` a la persona autenticada y `status` a `pending` de forma explícita, sin depender del valor por defecto de la columna. Actualizar usa `findOrFail` sobre el id, lo que da el 404 de la spec, y devuelve la tarea con el responsable recargado.

**Registro de controladores.** Un único controlador de tareas con `index`, `store` y `update`, referenciado en `start/routes.ts` con `controllers.Tasks`. El registro `.adonisjs/` se regenera al arrancar y su diff se commitea (convención del repo).

**Frontend: capa de API.** `lib/api.ts` gana `listTasks`, `createTask` y `updateTask`, y su tipo `method` admite `'PATCH'`. Los tipos `Task` y `TaskStatus` van en `lib/types.ts`. `FIELD_LABELS` y `translate` se extienden para `title` (obligatorio y longitud) y para el error de `status`, de modo que los mensajes lleguen ya en castellano y, en el caso del título, en lenguaje corriente («Escribe un título para la tarea.»; «El título es demasiado largo: admite hasta 255 caracteres.»). El 404 y el 422 sin campo mapeado caen en los mensajes genéricos existentes.

**Frontend: página y rutas.** `pages/tasks-page.tsx` dentro de `ProtectedRoute`, con el mismo marco visual que el perfil (`Card`, `Button`, `Input`, `Label`, `Alert`). La ruta `*` y los redirects de `PublicOnlyRoute` pasan de `/profile` a `/tasks`; el perfil gana un enlace a las tareas y la lista un enlace al perfil. Etiquetas de estado (Pendiente, En curso, Hecho) viven solo en el frontend, en un mapa de `TaskStatus` a texto; ningún valor en castellano viaja por la API.

**Selector de estado.** `components/ui/` no tiene un `Select`. Se usa un `<select>` nativo, con su etiqueta accesible por fila, estilado con los tokens y utilidades de Tailwind ya existentes. Alternativas descartadas: traer `select` con `npx shadcn@latest add` (la petición es reutilizar lo que hay y no ampliar el sistema) y un grupo de tres botones por fila (más ruido visual y peor con 200 filas).

**Estado de la lista en cliente.** La lista se pide al montar la página (con indicador de carga y aviso de error). Tras crear, se vuelve a pedir la lista en lugar de añadir la tarea al final en local: así no se inventa un orden en el cliente y se ve lo mismo que verá el resto. El cambio de estado es optimista: la fila cambia al instante, se llama a `updateTask` y, si falla, se revierte y se muestra un aviso. El formulario de creación usa `useAuthForm` para el estado de envío y el reparto de errores entre aviso y campo, con la comprobación local de título en blanco por el mismo camino que `failWith` usa en el registro.

**Estado vacío.** Con la lista cargada y sin tareas, se muestra un texto que explica para qué sirve la lista junto al mismo formulario de creación, no una tabla vacía.

## Risks / Trade-offs

- [Sin orden, la lista no responde «quién está en qué» con volumen] → Aceptado y declarado como punto abierto; se resuelve con una decisión de producto (PA-3) en un change posterior.
- [Se permite pasar a «Hecho» y salir de él con un gesto, sin confirmar] → Es la decisión de E2-4 CA-1; la reversibilidad queda cubierta porque cualquier transición es legal (PA-7).
- [Sin tests, las regresiones solo se detectan a mano] → Decisión explícita de este change; la verificación de cada tarea es manual (typecheck, build, lint y llamadas a la API).
- [`GET /tasks` sin paginación] → El PRD contempla del orden de 200 tareas; se acepta en este change.
- [Condición de carrera: `PATCH` simultáneos sobre la misma tarea] → Gana la última escritura; sin versionado, coherente con «una lista compartida sin permisos».
- [Un 401 en la API durante el uso de la lista] → La pantalla muestra el aviso de sesión caducada; no se cierra la sesión automáticamente en este change.
- [El árbol de trabajo trae cambios sin commitear en `backend/database/schema.ts` y en los `package*.json` del backend] → Antes de `migration:run`, revisar qué hay; la migración regenera `schema.ts` entero y esos cambios previos no son de este change.
