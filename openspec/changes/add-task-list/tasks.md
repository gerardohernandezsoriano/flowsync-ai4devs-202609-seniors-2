# Tasks

> Sin tests en este change: la verificación de cada tarea es manual (comandos, llamadas a la API o comportamiento visible en pantalla).

## 1. Backend: datos y modelo

- [x] 1.0 Antes de tocar nada, anotar con `git status` y `git diff --stat` los cambios previos sin commitear (`backend/database/schema.ts`, `backend/package.json`, `backend/package-lock.json` y los `package*.json` sin seguimiento de la raíz) y no incluirlos en ningún commit de este change salvo la regeneración de `schema.ts` que provoque la migración; verificar al final con `git diff <commit base> -- '**/package.json'` que este change no añade dependencias
- [x] 1.1 Crear la migración de `tasks` (`title` string 255 no nulo, `status` string no nulo con valor por defecto `pending`, `assignee_id` no nulo referenciando `users.id`, timestamps estándar, sin ninguna columna de fecha de vencimiento) y verificar que `node ace migration:run` la aplica sin errores
- [x] 1.2 Comprobar que `database/schema.ts` se ha regenerado con la clase de esquema de tareas y que no se editó a mano, y añadir el modelo de tarea que extiende esa clase generada, con solo la relación `assignee` hacia el usuario; verificar con `npm run typecheck` en `backend/`

## 2. Backend: API

- [x] 2.1 Añadir en `app/validators/` el validador de creación (`title` con `trim`, mínimo 1 y máximo 255) y el de actualización (`status` enum `pending`/`in_progress`/`done`, `assigneeId` con regla `exists` sobre `users.id`, ambos opcionales y obligatorios si falta el otro), confirmando antes las firmas en los `.d.ts` de VineJS y Lucid; verificar con `npm run typecheck`
- [x] 2.2 Crear el transformer de tarea que expone solo `id`, `title`, `status` y `assignee.fullName`, sin email, id de usuario ni fechas; verificar con `npm run typecheck`
- [x] 2.3 Crear el controlador de tareas con `index` (carga `assignee`, sin `orderBy`), `store` (responsable = persona autenticada, `status` = `pending`) y `update` (`findOrFail`, aplica `status` y/o `assigneeId`, devuelve la tarea con el responsable); todo con `serialize` y el transformer; verificar con `npm run typecheck` y `npm run lint`
- [x] 2.4 Registrar en `start/routes.ts` `GET /tasks`, `POST /tasks` y `PATCH /tasks/:id` dentro de `/api/v1` y bajo `middleware.auth()`, sin rutas de lectura individual ni de borrado; verificar con `node ace list:routes` que aparecen exactamente esas tres y arrancar el servidor para regenerar `.adonisjs/` y commitear el diff
- [x] 2.5 Verificar a mano con `curl` contra el servidor en marcha (con el token en una variable de entorno, sin pegarlo en el historial ni en el PR): 401 sin token en las tres operaciones; crear con `{"title":"x"}` devuelve `pending` y el nombre de quien crea; título ausente, en blanco y de 256 caracteres dan 422 sobre `title`; con 255 se crea; `status` o `assigneeId` en la creación se ignoran; `PATCH` con estado válido da 200, con `blocked` da 422, sin campos da 422, con responsable inexistente da 422 y con id inexistente da 404; `GET` y `DELETE` sobre `/tasks/1` y `GET /api/v1/teams` dan 404; un parámetro de orden en el listado se ignora; la respuesta no contiene email ni fechas

## 3. Frontend: capa de API y tipos

- [ ] 3.1 Añadir los tipos `Task` y `TaskStatus` a `frontend/src/lib/types.ts`; verificar con `npm run build` en `frontend/`
- [ ] 3.2 Añadir a `frontend/src/lib/api.ts` `listTasks`, `createTask` y `updateTask` (ampliando el tipo de método con `PATCH`) y extender las etiquetas y la traducción de errores con `title` (obligatorio y longitud, en lenguaje corriente, indicando el máximo de 255) y con el error de `status`; verificar con `npm run build` y `npm run lint`

## 4. Frontend: pantalla de tareas

- [ ] 4.1 Crear `frontend/src/pages/tasks-page.tsx` que pide la lista al montar, muestra indicador de carga y un aviso en castellano si falla, y pinta cada fila con título, nombre del responsable («Sin nombre» si es `null`) y estado como Pendiente, En curso o Hecho, en el orden recibido, sin fechas, sin presencia y sin vista «mis tareas»; verificar a mano en el navegador con tareas de dos cuentas distintas y con `npm run build`
- [ ] 4.2 Añadir el formulario de creación con un único campo de título y un botón, sin responsable, estado ni fecha, usando `useAuthForm`: botón deshabilitado durante el envío, aviso junto al campo para título en blanco y para título demasiado largo conservando el texto, y recarga de la lista tras crear con el campo vacío; verificar a mano creando una tarea, intentando una en blanco y otra de 256 caracteres
- [ ] 4.3 Añadir el estado vacío (texto que explica la lista y el formulario para crear la primera, en lugar de una lista vacía) y verificar a mano con una base sin tareas y creando la primera
- [ ] 4.4 Añadir a cada fila el `<select>` nativo con exactamente Pendiente, En curso y Hecho y el actual marcado, con cambio optimista y sin confirmación, que revierte la fila y muestra un aviso si `updateTask` falla; verificar a mano cambiando el estado de una tarea propia y de una ajena, y parando el backend para comprobar la reversión

## 5. Frontend: rutas y navegación

- [ ] 5.1 Registrar `/tasks` dentro de `ProtectedRoute` en `frontend/src/routes/app-routes.tsx`, cambiar la ruta `*` y el redirect de `PublicOnlyRoute` de `/profile` a `/tasks`, y añadir enlaces entre la lista y `frontend/src/pages/profile-page.tsx`; verificar a mano que sin sesión `/tasks` lleva a `/login`, que tras entrar o registrarse se ve la lista, que una dirección desconocida lleva a `/tasks` y que los enlaces van y vuelven con la sesión intacta

## 6. Documentación e integración

- [ ] 6.1 Añadir las tres rutas de tareas a la tabla de rutas de `CLAUDE.md` y verificar que coincide con la salida de `node ace list:routes`
- [ ] 6.2 Recorrido final con `npm run typecheck`, `npm run lint` y `npm run build` en sus capas, y un flujo completo a mano con dos cuentas (registro, crear, ver la tarea ajena, cambiar su estado, recargar), comprobando con la diferencia contra el commit base que ningún `package.json` ha ganado dependencias por culpa de este change
