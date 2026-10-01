# Spec Delta

## ADDED Requirements

### Requirement: Fecha de vencimiento opcional

El sistema SHALL permitir que una tarea tenga una fecha de vencimiento de calendario, sin hora, con formato `YYYY-MM-DD` en el campo `dueDate`, y SHALL permitir ponerla al crear, ponerla o cambiarla al actualizar y quitarla, sin comprobar de quién es la tarea.

#### Scenario: Tarea sin fecha por defecto
- **WHEN** se crea una tarea enviando solo el título
- **THEN** la tarea queda con `dueDate` a `null`

#### Scenario: Crear con fecha
- **WHEN** se crea una tarea con un `title` válido y `{ "dueDate": "2026-12-31" }`
- **THEN** el sistema responde 200 con la tarea con `dueDate` igual a `2026-12-31`

#### Scenario: Poner la fecha a una tarea sin ella
- **WHEN** se envía `{ "dueDate": "2026-12-31" }` sobre una tarea sin fecha
- **THEN** el sistema responde 200 con la tarea con esa fecha, y las siguientes lecturas la muestran igual

#### Scenario: Cambiar la fecha
- **WHEN** se envía una fecha distinta sobre una tarea que ya tenía otra
- **THEN** el sistema responde 200 con la nueva fecha

#### Scenario: Quitar la fecha con null
- **WHEN** se envía `{ "dueDate": null }` sobre una tarea con fecha
- **THEN** el sistema responde 200 con `dueDate` a `null` y `isOverdue` a `false`

#### Scenario: Quitar la fecha con cadena vacía
- **WHEN** se envía `{ "dueDate": "" }` sobre una tarea con fecha
- **THEN** el sistema responde 200 con `dueDate` a `null` y `isOverdue` a `false`

#### Scenario: Fecha ya pasada aceptada
- **WHEN** se pone una fecha anterior a hoy, al crear o al actualizar
- **THEN** el sistema la acepta sin rechazarla y la tarea queda con esa fecha

#### Scenario: Fecha que no existe
- **WHEN** se envía un `dueDate` que no es una fecha de calendario real, como `2026-02-30` o `2026-13-01`
- **THEN** el sistema responde 422 con un error sobre `dueDate` y la tarea conserva la fecha que tuviera

#### Scenario: Fecha incompleta o con hora
- **WHEN** se envía un `dueDate` incompleto, como `2026-10`, o con hora, como `2026-10-05T10:00:00`, o que no es texto
- **THEN** el sistema responde 422 con un error sobre `dueDate` y la tarea conserva la fecha que tuviera

#### Scenario: Otras ediciones no tocan la fecha
- **WHEN** se cambia el estado o el responsable de una tarea sin enviar `dueDate`
- **THEN** la tarea conserva su fecha exactamente igual

#### Scenario: Tarea de otra persona
- **WHEN** una persona pone, cambia o quita la fecha de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica sin advertencia ni permiso especial

### Requirement: Regla de vencimiento calculada por el servidor

El sistema SHALL devolver en cada tarea el campo booleano `isOverdue`, que es `true` únicamente cuando la tarea tiene fecha de vencimiento, esa fecha es anterior al día de referencia y su estado no es `done`, y SHALL calcularlo en cada lectura sin conservarlo.

#### Scenario: Fecha anterior a hoy
- **WHEN** una tarea con estado `pending` o `in_progress` tiene una fecha anterior al día de referencia
- **THEN** su `isOverdue` es `true`

#### Scenario: Fecha de hoy
- **WHEN** una tarea no hecha tiene como fecha el propio día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Fecha futura
- **WHEN** una tarea tiene una fecha posterior al día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Sin fecha no se vence
- **WHEN** una tarea sin fecha lleva semanas creada y sigue pendiente
- **THEN** su `isOverdue` es `false`

#### Scenario: Hecha con fecha pasada
- **WHEN** una tarea en estado `done` tiene una fecha anterior al día de referencia
- **THEN** su `isOverdue` es `false`

#### Scenario: Pasar a hecho deja de vencer
- **WHEN** se cambia a `done` el estado de una tarea vencida
- **THEN** la respuesta trae `isOverdue` a `false` y `dueDate` con la misma fecha de antes

#### Scenario: Salir de hecho con fecha pasada
- **WHEN** se cambia a `pending` o `in_progress` una tarea en `done` cuya fecha es anterior al día de referencia
- **THEN** la respuesta trae `isOverdue` a `true`

#### Scenario: Aplazar la fecha
- **WHEN** se cambia a una fecha posterior al día de referencia la fecha de una tarea vencida
- **THEN** la respuesta trae `isOverdue` a `false`

#### Scenario: Poner una fecha ya pasada
- **WHEN** se pone una fecha anterior al día de referencia a una tarea no hecha
- **THEN** la respuesta de esa misma operación trae `isOverdue` a `true`

#### Scenario: Reasignar no cambia el veredicto
- **WHEN** se cambia el responsable de una tarea con fecha
- **THEN** su `dueDate` y su `isOverdue` quedan como estaban

#### Scenario: Vence con el paso del día
- **WHEN** una tarea no hecha con fecha de hoy se pide de nuevo con un día de referencia posterior, sin que nadie la haya modificado
- **THEN** su `isOverdue` pasa a `true`

#### Scenario: Falso por defecto
- **WHEN** se lee cualquier tarea
- **THEN** la respuesta incluye `isOverdue` como booleano, nunca ausente ni nulo

### Requirement: Día de referencia del cliente

El sistema SHALL calcular `isOverdue` respecto al día que el cliente indique en el parámetro de query `today` (`YYYY-MM-DD`) en cualquier operación de tareas, y SHALL usar el día actual del servidor en UTC cuando no se indique.

#### Scenario: Dos personas, dos días
- **WHEN** una tarea no hecha tiene fecha `2026-10-05` y se lee a la vez con `today=2026-10-05` y con `today=2026-10-06`
- **THEN** la primera lectura trae `isOverdue` a `false` y la segunda a `true`, y ambas son correctas

#### Scenario: Sin día de referencia
- **WHEN** se lee una tarea sin parámetro `today`
- **THEN** el sistema calcula `isOverdue` con el día actual del servidor en UTC

#### Scenario: Día de referencia mal formado
- **WHEN** se envía un `today` que no es una fecha `YYYY-MM-DD` real
- **THEN** el sistema responde 422 con un error sobre `today` y no devuelve ni modifica ninguna tarea

#### Scenario: Aplica a todas las operaciones
- **WHEN** se envía `today` al listar, leer, crear o actualizar tareas
- **THEN** el `isOverdue` de las tareas de la respuesta se calcula con ese día

### Requirement: El cliente no controla el veredicto

El sistema SHALL ignorar cualquier `isOverdue` que llegue en una petición y SHALL NOT permitir fijarlo ni cambiarlo desde fuera.

#### Scenario: Enviar isOverdue al crear
- **WHEN** se crea una tarea con `{ "title": "x", "isOverdue": true }`
- **THEN** el sistema ignora `isOverdue` y la tarea sin fecha queda con `isOverdue` a `false`

#### Scenario: Enviar isOverdue al actualizar
- **WHEN** se actualiza una tarea con `{ "status": "done", "isOverdue": true }`
- **THEN** el sistema ignora `isOverdue` y responde con el veredicto que resulta de la regla

#### Scenario: Solo isOverdue
- **WHEN** la petición de actualización incluye únicamente `isOverdue`
- **THEN** el sistema responde 422, porque no hay nada que actualizar, y la tarea no cambia

### Requirement: Lectura individual de una tarea

El sistema SHALL devolver una tarea concreta en `GET /api/v1/tasks/:id` a cualquier persona con sesión, con la misma representación que el resto de operaciones de tareas.

#### Scenario: Tarea existente
- **WHEN** una persona con sesión pide una tarea que existe
- **THEN** el sistema responde 200 con `data` con `id`, `title`, `status`, `assignee` (solo `fullName`), `dueDate` e `isOverdue`

#### Scenario: Tarea inexistente
- **WHEN** se pide una tarea cuyo identificador no existe
- **THEN** el sistema responde 404

#### Scenario: Leer no modifica nada
- **WHEN** se lee una tarea una o varias veces
- **THEN** su estado, su responsable y su fecha no cambian

#### Scenario: Sin sesión
- **WHEN** se pide una tarea sin token o con un token desconocido
- **THEN** el sistema responde 401 y no devuelve la tarea

### Requirement: Página de la tarea con su fecha

La aplicación web SHALL mostrar en `/tasks/:id`, a las personas con sesión, una página mínima de la tarea con su título, la fecha de vencimiento editable y la señal de vencida, sin mostrar ni editar responsable, estado ni título.

#### Scenario: Abrir desde la lista
- **WHEN** una persona pulsa el título de una tarea en la lista
- **THEN** llega a la página de esa tarea y ve su título y su fecha, o un campo de fecha vacío si no tiene

#### Scenario: Poner la fecha
- **WHEN** la persona elige una fecha completa en el campo
- **THEN** la fecha queda guardada sin pulsar ningún botón de guardar y se ve reflejada al instante, sin recargar ni reabrir la tarea

#### Scenario: Quitar la fecha
- **WHEN** la persona pulsa la acción de quitar la fecha
- **THEN** el campo queda vacío y la fecha se elimina de inmediato, sin diálogo de confirmación

#### Scenario: Fecha incompleta o imposible
- **WHEN** la persona deja la fecha a medias o escribe una que no existe
- **THEN** la tarea conserva la fecha que tuviera y ve junto al campo, en lenguaje corriente, que esa fecha no es válida

#### Scenario: Señal de vencida
- **WHEN** la tarea tiene `isOverdue` a `true`
- **THEN** la persona ve una señal propia con el texto «Vencida» y un icono, sin tener que comparar la fecha con el día de hoy, y la señal no depende solo del color

#### Scenario: Sin señal cuando no está vencida
- **WHEN** la tarea tiene fecha de hoy, fecha futura, está hecha o no tiene fecha
- **THEN** la página no muestra la señal de vencida

#### Scenario: Sin fecha no se avisa
- **WHEN** la tarea no tiene fecha
- **THEN** la persona no ve ningún aviso, recordatorio ni indicación de que le falte algo

#### Scenario: Aplazar o quitar resuelve el vencimiento
- **WHEN** la persona cambia a una fecha posterior a hoy o quita la fecha de una tarea vencida
- **THEN** la señal de vencida desaparece al instante

#### Scenario: El día de la persona
- **WHEN** la página pide o guarda una tarea
- **THEN** envía el día de calendario local de la persona, de modo que el veredicto es el de quien mira

#### Scenario: Cambio rechazado por el servidor
- **WHEN** el servidor rechaza o no responde al guardar la fecha
- **THEN** el campo vuelve a la fecha que tenía y la persona ve un aviso con el motivo en castellano

#### Scenario: Tarea inexistente
- **WHEN** la persona abre una tarea que ya no existe
- **THEN** ve un aviso de que la tarea no existe y un enlace para volver a la lista

#### Scenario: Teclado
- **WHEN** una persona usa solo el teclado
- **THEN** puede alcanzar y operar el campo de fecha y la acción de quitarla

#### Scenario: Volver a la lista
- **WHEN** la persona pulsa el enlace de volver
- **THEN** llega a la lista de tareas sin perder la sesión

### Requirement: La lista no muestra fechas ni vencimiento

La aplicación web SHALL mostrar en la lista de tareas únicamente título, responsable y estado, sin ninguna fecha ni marca de vencida, y el formulario de creación SHALL seguir pidiendo solo el título.

#### Scenario: Tareas con fecha y vencidas
- **WHEN** hay tareas con fecha de vencimiento, algunas vencidas, y una persona mira la lista
- **THEN** no ve ninguna fecha ni marca de vencida en ninguna fila, y cada título es un enlace a la página de su tarea

#### Scenario: Tareas sin fecha
- **WHEN** hay tareas sin fecha en la lista
- **THEN** no reciben ningún aviso ni indicación de que les falte algo

#### Scenario: Crear no ofrece fecha
- **WHEN** una persona recorre el formulario de creación
- **THEN** el título es lo único que se le pide, sin campo ni sugerencia de fecha

## MODIFIED Requirements

### Requirement: Listado de tareas por API

El sistema SHALL devolver, en `GET /api/v1/tasks`, todas las tareas del espacio, y SHALL devolver el mismo conjunto a cualquier persona con sesión.

#### Scenario: Lista con tareas
- **WHEN** una persona con sesión pide la lista y hay tareas
- **THEN** el sistema responde 200 con `data` como un array en el que cada tarea trae `id`, `title`, `status`, `assignee`, `dueDate` e `isOverdue`, y `assignee` contiene únicamente el `fullName` del responsable (o `null` si no tiene nombre)

#### Scenario: Misma lista para todos
- **WHEN** dos personas distintas con sesión piden la lista sin que nadie cambie nada entre medias
- **THEN** ambas reciben exactamente las mismas tareas

#### Scenario: Tareas de otras personas incluidas
- **WHEN** otra persona crea una tarea y se la queda como responsable, y yo pido la lista
- **THEN** esa tarea está en la respuesta

#### Scenario: Nada reservado del responsable ni fechas
- **WHEN** se pide la lista
- **THEN** ninguna tarea expone el email ni el identificador del responsable, ni fechas de creación o modificación; el único campo de fecha es `dueDate`

#### Scenario: Espacio sin tareas
- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** el sistema responde 200 con `data` como un array vacío

#### Scenario: Sin criterio de orden
- **WHEN** se pide la lista con un parámetro de ordenación en la petición
- **THEN** el sistema lo ignora y no promete ningún criterio de ordenación de las tareas devueltas

#### Scenario: Pedir la lista no modifica nada
- **WHEN** se pide la lista una o varias veces
- **THEN** ninguna tarea cambia de estado, de responsable ni de fecha

### Requirement: Las operaciones de tareas exigen sesión

El sistema SHALL responder 401 a las peticiones sin autenticación válida sobre listar, leer, crear y actualizar tareas, y SHALL NOT devolver ni modificar ninguna tarea en ese caso.

#### Scenario: Listar sin sesión
- **WHEN** se pide `GET /api/v1/tasks` sin token o con un token desconocido
- **THEN** el sistema responde 401 y no devuelve ninguna tarea

#### Scenario: Leer sin sesión
- **WHEN** se pide `GET /api/v1/tasks/:id` sin token o con un token desconocido
- **THEN** el sistema responde 401 y no devuelve la tarea

#### Scenario: Crear o actualizar sin sesión
- **WHEN** se envía una creación o una actualización de tarea sin token o con un token desconocido
- **THEN** el sistema responde 401 y no crea ni cambia ninguna tarea

### Requirement: Actualización de una tarea

El sistema SHALL permitir a cualquier persona con sesión cambiar, con `PATCH /api/v1/tasks/:id`, el `status`, el responsable (`assigneeId`) y la fecha de vencimiento (`dueDate`) de cualquier tarea, sin importar quién la lleve, y SHALL devolver la tarea ya actualizada.

#### Scenario: Cambiar el estado
- **WHEN** se envía `{ "status": "in_progress" }` sobre una tarea existente
- **THEN** el sistema responde 200 con la tarea con `status` igual a `in_progress`, y las siguientes listas la muestran así

#### Scenario: Cambiar el responsable
- **WHEN** se envía `{ "assigneeId": <id de otra persona registrada> }` sobre una tarea existente
- **THEN** el sistema responde 200 con la tarea a nombre de esa persona

#### Scenario: Cambiar solo la fecha
- **WHEN** se envía `{ "dueDate": "2026-12-31" }` sobre una tarea existente
- **THEN** el sistema responde 200 con la tarea con esa fecha, y su estado y responsable no cambian

#### Scenario: Tarea de otra persona
- **WHEN** una persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una tarea propia, sin permiso especial ni advertencia

#### Scenario: Cualquier transición vale
- **WHEN** se cambia el estado de una tarea a cualquiera de los otros dos estados, incluido salir de `done`
- **THEN** el sistema aplica el cambio

#### Scenario: Estado y responsable a la vez
- **WHEN** se envían `status`, `assigneeId` y `dueDate` válidos en la misma petición, o cualquier combinación de ellos
- **THEN** el sistema aplica todos los cambios enviados

#### Scenario: Nada que actualizar
- **WHEN** la petición no incluye ni `status` ni `assigneeId` ni `dueDate`
- **THEN** el sistema responde 422 y la tarea no cambia

#### Scenario: Responsable inexistente
- **WHEN** se envía un `assigneeId` que no corresponde a ninguna persona registrada
- **THEN** el sistema responde 422 con un error sobre `assigneeId` y la tarea no cambia

#### Scenario: Tarea inexistente
- **WHEN** se actualiza una tarea cuyo identificador no existe
- **THEN** el sistema responde 404

#### Scenario: El título no se edita
- **WHEN** la petición de actualización incluye un `title`
- **THEN** el sistema lo ignora y el título de la tarea no cambia

### Requirement: Conjunto cerrado de operaciones de tareas

El sistema SHALL ofrecer sobre tareas únicamente las operaciones de listar, leer una, crear y actualizar, y SHALL NOT ofrecer borrado ni endpoints de equipo.

#### Scenario: Lectura individual inexistente
- **WHEN** se pide `GET /api/v1/tasks/:id` con un identificador que no corresponde a ninguna tarea
- **THEN** el sistema responde 404

#### Scenario: Borrado inexistente
- **WHEN** se envía `DELETE /api/v1/tasks/:id`
- **THEN** el sistema responde 404 y la tarea sigue en la lista

#### Scenario: Endpoints de equipo inexistentes
- **WHEN** se pide cualquier ruta de equipo, como `GET /api/v1/teams`
- **THEN** el sistema responde 404
