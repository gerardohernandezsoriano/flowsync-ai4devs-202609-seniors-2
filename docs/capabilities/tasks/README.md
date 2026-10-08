# Capability `tasks`

La lista de trabajo del equipo: una sola lista compartida por todo el espacio, en la que
cada tarea muestra su título, su responsable y su estado sin abrirla. Crear una tarea
cuesta solo escribir el título. Desde la lista se cambia el estado, y desde la pantalla de
cada tarea se pone o se quita una fecha de vencimiento.

> **El contrato de esta capability es [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md).**
> Este README no repite sus reglas: indica dónde está cada una y en qué parte del código
> se aplica. Si este fichero y la spec dicen cosas distintas, manda la spec.

## Endpoints

Todos van bajo `/api/v1` y exigen `Authorization: Bearer <token>` (el grupo lleva
`middleware.auth()` en `backend/start/routes.ts`). Las respuestas correctas llegan
envueltas en `{ "data": ... }`, y los errores de validación como
`{ "errors": [{ "message", "rule", "field" }] }`.

| Método | Ruta | Controlador | Validador | Transformer de la respuesta |
|---|---|---|---|---|
| `GET` | `/tasks` | `TasksController.index` | `listTasksValidator` | `TaskTransformer` (colección) |
| `POST` | `/tasks` | `TasksController.store` | `createTaskValidator` | `TaskTransformer` |
| `GET` | `/tasks/:id` | `TasksController.show` | `taskReferenceDayValidator` | `TaskDetailTransformer` |
| `PATCH` | `/tasks/:id/status` | `TaskStatusesController.update` | `updateTaskStatusValidator` | `TaskTransformer` |
| `PUT` | `/tasks/:id/due-date` | `TaskDueDatesController.update` | `setTaskDueDateValidator` | `TaskDetailTransformer` |

Los parámetros, los códigos de respuesta y los esquemas de cada operación están en el
documento OpenAPI, servido en `http://localhost:3333/api.json`, con la interfaz en
`http://localhost:3333/api`. Se genera a partir de las anotaciones de los controladores y
de `backend/app/openapi/schemas.ts`.

## Reglas de negocio

La redacción completa y los scenarios están en la spec. Esta tabla solo indica dónde vive
cada grupo de reglas:

| Tema | Requirements de la spec | Dónde se aplica |
|---|---|---|
| Crear con solo el título | [Creación…](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título), [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título), [Título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) | `createTaskValidator`; `TasksController.store` fija el responsable y el estado |
| La lista compartida | [Una sola lista](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio), [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) | `TasksController.index`, `DEFAULT_LIST_STATUSES` en `app/models/task.ts`, `TaskTransformer` |
| Acotar por estado | [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [Filtro válido sin resultados](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima), [Estado que no existe](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) | `listTasksValidator`, `TasksController.index` |
| Responsable | [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) | `TaskAssigneeTransformer` |
| Estados | [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos), [Cambio de estado](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) | `TASK_STATUSES` en `app/models/task.ts`, `updateTaskStatusValidator` |
| Vencimiento | [Fecha opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional), [Fijar, cambiar y retirar](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento), [Cuándo está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida), [El día de referencia](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira), [Tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) | `Task.isOverdueOn()` (única definición de «vencida»), `setTaskDueDateValidator`, `taskReferenceDayValidator`, `TaskDetailTransformer` |
| Sesión | [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) | `middleware.auth()` en `start/routes.ts` |
| Interfaz | Los requirements que empiezan por «La interfaz SHALL» (pantallas, filtro en la URL, mensajes de lista vacía, señal de vencida…) | `frontend/src/pages/tasks-page.tsx`, `task-page.tsx`, `components/task-filter.tsx`, `components/task-item.tsx`; las llamadas a la API, en `frontend/src/lib/api.ts` |

El porqué de cada decisión está en los changes archivados de
[`openspec/changes/archive/`](../../../openspec/changes/archive/): `add-task-list`,
`add-task-due-date` y `add-task-status-filter`.

### Discrepancias conocidas con la spec (a 2026-10-08)

- **Estado inventado en el filtro:** la spec exige `422`, pero `listTasksValidator`
  acepta cualquier texto (`vine.string().optional()`, desde el commit `8c15707`). Por
  eso `GET /tasks?status=archivado` responde `200` con lista vacía. Cuando se corrija,
  borra esta nota.

## Cómo probarlo en local

### Arrancar

```bash
# backend (http://localhost:3333)
cd backend
npm install
cp .env.example .env && node ace generate:key   # solo la primera vez
node ace migration:run
npm run dev

# frontend (http://localhost:5173), en otra terminal
cd frontend
npm install
cp .env.example .env                            # VITE_API_URL=http://localhost:3333
npm run dev
```

En el navegador, regístrate en `/register`: se entra directamente en la lista
(`/tasks`).

### Tests automáticos

```bash
cd backend
node ace test functional --files="tasks/*"   # solo los de esta capability
npm test                                  # todas las suites
```

Hoy los tests de la capability se limitan a `tests/functional/tasks/assignee.spec.ts`, que
cubre lo que cada tarea muestra de su responsable. El resto de la spec todavía no tiene
test.

Ojo: los tests usan el mismo `tmp/db.sqlite3` que el servidor de desarrollo. Cada grupo
se aísla con `testUtils.db().withGlobalTransaction()`, y cualquier fichero de test nuevo
debe hacer lo mismo.

### A mano contra la API

```bash
B=http://localhost:3333/api/v1
TOKEN=$(curl -s -X POST $B/auth/signup -H 'Content-Type: application/json' \
  -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secret1234","passwordConfirmation":"secret1234"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')
H="Authorization: Bearer $TOKEN"

curl -s -X POST $B/tasks -H "$H" -H 'Content-Type: application/json' -d '{"title":"Revisar el informe"}'
curl -s "$B/tasks" -H "$H"                             # pendientes y en curso
curl -s "$B/tasks?status=done" -H "$H"                 # solo las hechas
curl -s "$B/tasks/1?today=$(date +%F)" -H "$H"        # detalle; today es obligatorio
curl -s -X PATCH $B/tasks/1/status -H "$H" -H 'Content-Type: application/json' -d '{"status":"in_progress"}'
curl -s -X PUT $B/tasks/1/due-date -H "$H" -H 'Content-Type: application/json' \
  -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$(date +%F)\"}"
```

Si el email ya existe, entra con `POST $B/auth/login` (`{"email","password"}`): devuelve el
token en el mismo sitio. La interfaz de `http://localhost:3333/api` permite lanzar las
mismas peticiones desde el navegador.
