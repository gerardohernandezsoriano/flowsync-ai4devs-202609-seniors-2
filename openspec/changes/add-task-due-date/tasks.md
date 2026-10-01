# Tasks

> Sin tests en este change: la verificación de cada tarea es manual (comandos, llamadas a la API o comportamiento visible en pantalla).

## 1. Backend: datos y regla de dominio

- [ ] 1.0 Antes de tocar nada, anotar con `git status` y `git diff --stat` los cambios previos sin commitear (por ejemplo `backend/database/schema.ts`, `backend/package.json` y `backend/package-lock.json`) y no incluirlos en ningún commit de este change salvo la parte propia de la regeneración de `schema.ts`; verificar al final con `git diff <commit base> -- '**/package.json'` que este change no añade dependencias
- [ ] 1.1 Crear la migración que añade `due_date` (tipo fecha, nulable) a `tasks` con su reverso que la elimina, sin columna de vencimiento calculado; verificar que `node ace migration:run` la aplica sobre una base con tareas, que esas tareas quedan con `dueDate` a `null` y que `node ace migration:rollback` deja el esquema como estaba
- [ ] 1.2 Comprobar que `database/schema.ts` se ha regenerado con la columna de fecha y no se editó a mano, y añadir al modelo de tarea el método de dominio que decide el vencimiento comparando el texto de calendario (fecha, anterior a `today`, estado distinto de `done`); verificar con `npm run typecheck` en `backend/` y revisando que la regla no está reimplementada en ninguna otra capa

## 2. Backend: API

- [ ] 2.1 Confirmar en los `.d.ts` de VineJS el comportamiento estricto de `vine.date` con formato `YYYY-MM-DD`, la validación de la query con `validateUsing` y qué expone `field.parent` en `requiredWhen`; después ampliar `app/validators/task.ts` (`dueDate` opcional y nulable en crear y actualizar, cadena vacía tratada como `null`, «al menos uno de los tres» sin rechazar `{ "dueDate": null }`) y añadir el validador del día de referencia `today`; verificar con `npm run typecheck` y `npm run lint`
- [ ] 2.2 Hacer que el transformer de tarea reciba el día de referencia y exponga `dueDate` (`YYYY-MM-DD` o `null`) e `isOverdue`, sin email, id de usuario ni marcas de creación o modificación; verificar con `npm run typecheck`
- [ ] 2.3 Ajustar `index`, `store` y `update` del controlador de tareas para resolver `today` (parámetro o día UTC del servidor) y pasarlo al transformer, aceptar `dueDate` al crear y actualizar tocando solo los campos presentes, añadir `show` (404 si no existe) y registrar `GET /:id` en el grupo de tareas bajo `middleware.auth()`; arrancar el servidor para regenerar `.adonisjs/`, commitear el diff y verificar con `node ace list:routes` que están las cuatro rutas de tareas y ningún `DELETE`
- [ ] 2.4 Verificar a mano con `curl` (con el token en una variable de entorno, sin pegarlo en el historial ni en el PR) sobre una copia aislada del backend con su propia base de datos: fecha pasada aceptada y `isOverdue` a `true` en la misma respuesta; fecha de hoy y futura a `false`; sin fecha y `done` con fecha pasada a `false`; pasar a `done` conserva la fecha; salir de `done` con fecha pasada vuelve a `true`; mismas tareas con `today` de dos días distintos dan veredictos distintos; `today` mal formado da 422; `2026-02-30`, `2026-10`, `2026-10-05T10:00:00` y un número dan 422 sobre `dueDate`; `null` y cadena vacía la quitan; `{}`, `{ "isOverdue": true }` dan 422 y `{ "dueDate": null }` da 200; `isOverdue` enviado al crear o actualizar se ignora; reasignar no toca la fecha; `GET /tasks/:id` da 200 con la tarea, 404 si no existe y 401 sin token; `DELETE /tasks/:id` y `GET /teams` siguen dando 404

## 3. Frontend: capa de API y tipos

- [ ] 3.1 Añadir `dueDate` e `isOverdue` al tipo `Task` en `frontend/src/lib/types.ts`; verificar con `npm run build` en `frontend/`
- [ ] 3.2 Añadir a `frontend/src/lib/api.ts` el ayudante del día local (con los componentes de la fecha local, no con `toISOString`), el envío de `today` en todas las llamadas de tareas, `getTask`, la ampliación de `updateTask` para `status` y/o `dueDate` (incluido `null`) y los mensajes en castellano de `dueDate` y `today`; verificar con `npm run build` y `npm run lint`

## 4. Frontend: página de la tarea y lista

- [ ] 4.1 Crear `frontend/src/pages/task-page.tsx` que carga la tarea por id, muestra su título, un campo de fecha no controlado con guardado automático al elegir una fecha completa, la acción «Quitar fecha» sin confirmación, el error junto al campo cuando `validity.badInput` indica fecha incompleta o imposible (sin guardar y conservando la fecha previa), la señal «Vencida» con icono y texto solo cuando el servidor devuelve `isOverdue`, el aviso con enlace a la lista si la tarea no existe, la reversión con aviso si falla el guardado y el descarte de respuestas superadas; verificar a mano en el navegador cada escenario del delta y con `npm run build`
- [ ] 4.2 Convertir el título de cada fila de `frontend/src/pages/tasks-page.tsx` en un enlace a `/tasks/:id`, sin mostrar fecha ni marca de vencida en la lista, y registrar `/tasks/:id` dentro de la ruta protegida en `frontend/src/routes/app-routes.tsx`; verificar a mano que sin sesión `/tasks/:id` lleva a `/login`, que la lista sigue sin fechas ni marcas y que el formulario de creación sigue con un solo campo, y con `npm run build` y `npm run lint`

## 5. Documentación

- [ ] 5.1 Añadir las rutas de tareas (listar, leer, crear y actualizar) a la tabla de rutas de `CLAUDE.md` y verificar que coincide con la salida de `node ace list:routes`

## 6. Integración

- [ ] 6.1 Recorrido final con `npm run typecheck`, `npm run lint` y `npm run build` en sus capas y un flujo completo a mano (crear una tarea, abrirla, ponerle una fecha pasada y ver «Vencida», aplazarla y ver que desaparece, pasarla a «Hecho» desde la lista y comprobar que no está vencida, quitar la fecha), comprobando con la diferencia contra el commit base que ningún `package.json` ha ganado dependencias por culpa de este change
