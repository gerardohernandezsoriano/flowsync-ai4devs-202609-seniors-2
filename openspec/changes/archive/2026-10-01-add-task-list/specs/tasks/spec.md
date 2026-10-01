# Spec Delta

## Purpose

Dar al equipo una única lista compartida de tareas donde cada fila dice qué es, quién la lleva y en qué estado está, y donde cualquiera puede apuntar una tarea con solo un título y cambiar su estado sin salir de la lista.

## ADDED Requirements

### Requirement: Listado de tareas por API

El sistema SHALL devolver, en `GET /api/v1/tasks`, todas las tareas del espacio, y SHALL devolver el mismo conjunto a cualquier persona con sesión.

#### Scenario: Lista con tareas
- **WHEN** una persona con sesión pide la lista y hay tareas
- **THEN** el sistema responde 200 con `data` como un array en el que cada tarea trae `id`, `title`, `status` y `assignee`, y `assignee` contiene únicamente el `fullName` del responsable (o `null` si no tiene nombre)

#### Scenario: Misma lista para todos
- **WHEN** dos personas distintas con sesión piden la lista sin que nadie cambie nada entre medias
- **THEN** ambas reciben exactamente las mismas tareas

#### Scenario: Tareas de otras personas incluidas
- **WHEN** otra persona crea una tarea y se la queda como responsable, y yo pido la lista
- **THEN** esa tarea está en la respuesta

#### Scenario: Nada reservado del responsable ni fechas
- **WHEN** se pide la lista
- **THEN** ninguna tarea expone el email ni el identificador del responsable, ni ningún campo de fecha

#### Scenario: Espacio sin tareas
- **WHEN** se pide la lista y no se ha creado ninguna tarea
- **THEN** el sistema responde 200 con `data` como un array vacío

#### Scenario: Sin criterio de orden
- **WHEN** se pide la lista con un parámetro de ordenación en la petición
- **THEN** el sistema lo ignora y no promete ningún criterio de ordenación de las tareas devueltas

#### Scenario: Pedir la lista no modifica nada
- **WHEN** se pide la lista una o varias veces
- **THEN** ninguna tarea cambia de estado ni de responsable

### Requirement: Las operaciones de tareas exigen sesión

El sistema SHALL responder 401 a las peticiones sin autenticación válida sobre listar, crear y actualizar tareas, y SHALL NOT devolver ni modificar ninguna tarea en ese caso.

#### Scenario: Listar sin sesión
- **WHEN** se pide `GET /api/v1/tasks` sin token o con un token desconocido
- **THEN** el sistema responde 401 y no devuelve ninguna tarea

#### Scenario: Crear o actualizar sin sesión
- **WHEN** se envía una creación o una actualización de tarea sin token o con un token desconocido
- **THEN** el sistema responde 401 y no crea ni cambia ninguna tarea

### Requirement: Creación de una tarea con solo el título

El sistema SHALL crear una tarea cuando `POST /api/v1/tasks` recibe un `title` válido, sin requerir ningún otro dato, dejándola en estado `pending` y con quien la crea como responsable.

#### Scenario: Solo con título
- **WHEN** una persona con sesión envía `{ "title": "Preparar la demo" }`
- **THEN** el sistema responde 200 con la tarea creada, con `status` igual a `pending` y `assignee` con el nombre de quien la crea, y la tarea aparece en las siguientes listas

#### Scenario: Responsable sin nombre
- **WHEN** una persona sin nombre completo crea una tarea
- **THEN** la tarea queda a su nombre y su `assignee.fullName` es `null`

#### Scenario: Espacios sobrantes en el título
- **WHEN** se envía un título con espacios al principio o al final
- **THEN** la tarea se guarda con el título sin esos espacios

#### Scenario: Estado y responsable no se eligen al crear
- **WHEN** la petición de creación incluye además `status` o `assigneeId`
- **THEN** el sistema los ignora y la tarea nace en `pending` y a nombre de quien la crea

### Requirement: Título obligatorio y acotado

El sistema SHALL rechazar con 422 la creación de una tarea cuyo título falte, esté en blanco o supere los 255 caracteres, SHALL indicar el error sobre el campo `title`, y SHALL NOT crear ni guardar una versión recortada.

#### Scenario: Título ausente
- **WHEN** se envía una creación sin `title`
- **THEN** el sistema responde 422 con un error sobre `title` y no crea ninguna tarea

#### Scenario: Título vacío o en blanco
- **WHEN** se envía un `title` vacío o formado solo por espacios
- **THEN** el sistema responde 422 con un error sobre `title` y no crea ninguna tarea

#### Scenario: Título demasiado largo
- **WHEN** se envía un `title` de más de 255 caracteres
- **THEN** el sistema responde 422 con un error sobre `title` y no crea ninguna tarea, ni siquiera con el título recortado

#### Scenario: Título en el límite
- **WHEN** se envía un `title` de exactamente 255 caracteres
- **THEN** el sistema crea la tarea con el título completo

#### Scenario: Título que no es texto
- **WHEN** se envía un `title` que no es una cadena de texto
- **THEN** el sistema responde 422 con un error sobre `title`

### Requirement: Estados cerrados

El sistema SHALL admitir únicamente los estados `pending`, `in_progress` y `done`, y SHALL NOT ofrecer forma de añadir, renombrar ni eliminar estados.

#### Scenario: Estado fuera del conjunto
- **WHEN** se intenta actualizar una tarea con un `status` distinto de `pending`, `in_progress` o `done`, por ejemplo `blocked` o `Hecho`
- **THEN** el sistema responde 422 con un error sobre `status` y la tarea conserva su estado

#### Scenario: Cada tarea tiene exactamente un estado
- **WHEN** se pide la lista en cualquier momento
- **THEN** todas las tareas traen un `status` que es uno de los tres valores del conjunto

### Requirement: Actualización de una tarea

El sistema SHALL permitir a cualquier persona con sesión cambiar, con `PATCH /api/v1/tasks/:id`, el `status` y el responsable (`assigneeId`) de cualquier tarea, sin importar quién la lleve, y SHALL devolver la tarea ya actualizada.

#### Scenario: Cambiar el estado
- **WHEN** se envía `{ "status": "in_progress" }` sobre una tarea existente
- **THEN** el sistema responde 200 con la tarea con `status` igual a `in_progress`, y las siguientes listas la muestran así

#### Scenario: Cambiar el responsable
- **WHEN** se envía `{ "assigneeId": <id de otra persona registrada> }` sobre una tarea existente
- **THEN** el sistema responde 200 con la tarea a nombre de esa persona

#### Scenario: Tarea de otra persona
- **WHEN** una persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una tarea propia, sin permiso especial ni advertencia

#### Scenario: Cualquier transición vale
- **WHEN** se cambia el estado de una tarea a cualquiera de los otros dos estados, incluido salir de `done`
- **THEN** el sistema aplica el cambio

#### Scenario: Estado y responsable a la vez
- **WHEN** se envían `status` y `assigneeId` válidos en la misma petición
- **THEN** el sistema aplica ambos cambios

#### Scenario: Nada que actualizar
- **WHEN** la petición no incluye ni `status` ni `assigneeId`
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

El sistema SHALL ofrecer sobre tareas únicamente las operaciones de listar, crear y actualizar, y SHALL NOT ofrecer lectura individual de una tarea, borrado ni endpoints de equipo.

#### Scenario: Lectura individual inexistente
- **WHEN** se pide `GET /api/v1/tasks/:id`
- **THEN** el sistema responde 404

#### Scenario: Borrado inexistente
- **WHEN** se envía `DELETE /api/v1/tasks/:id`
- **THEN** el sistema responde 404 y la tarea sigue en la lista

#### Scenario: Endpoints de equipo inexistentes
- **WHEN** se pide cualquier ruta de equipo, como `GET /api/v1/teams`
- **THEN** el sistema responde 404

### Requirement: Pantalla de lista de tareas

La aplicación web SHALL mostrar en `/tasks`, a las personas con sesión, una única lista con todas las tareas del espacio, donde cada fila muestra el título, el nombre del responsable y el estado.

#### Scenario: Una fila lo dice todo
- **WHEN** una persona abre la lista y hay tareas
- **THEN** cada fila muestra su título, el nombre de quien la lleva y su estado como «Pendiente», «En curso» o «Hecho», sin necesidad de abrir nada

#### Scenario: Responsable sin nombre
- **WHEN** el responsable de una tarea no tiene nombre puesto, o su nombre está vacío o en blanco
- **THEN** la fila muestra «Sin nombre» y nunca su email ni su identificador

#### Scenario: Mismo contenido para todos
- **WHEN** dos personas distintas abren la lista sin tocar nada
- **THEN** ven las mismas tareas, incluidas las que otras personas crearon para sí

#### Scenario: Sin fechas ni marcas de vencida
- **WHEN** una persona recorre la lista
- **THEN** no ve ninguna fecha ni marca de vencida en ninguna fila

#### Scenario: Sin presencia
- **WHEN** hay otras personas usando la aplicación a la vez
- **THEN** la lista no muestra quién está conectado ni actividad por persona

#### Scenario: Una sola vista
- **WHEN** una persona busca otras vistas de tareas en la aplicación
- **THEN** no existe ninguna vista «mis tareas» separada de la lista del equipo

#### Scenario: Mismo orden que el servidor
- **WHEN** la lista se pinta
- **THEN** las tareas aparecen en el orden en que las entrega el servidor, sin que la pantalla las reordene

#### Scenario: Carga de la lista
- **WHEN** la lista se está pidiendo al servidor
- **THEN** la persona ve un indicador de carga en lugar de una lista vacía

#### Scenario: Fallo al cargar
- **WHEN** la lista no se puede cargar
- **THEN** la persona ve un aviso con el motivo en castellano y no una lista vacía

### Requirement: Estado vacío de la lista

La aplicación web SHALL explicar qué es la lista y ofrecer crear la primera tarea cuando el espacio no tiene ninguna, en lugar de mostrar una lista vacía sin más.

#### Scenario: Todavía no hay tareas
- **WHEN** una persona abre la lista y no se ha creado ninguna tarea
- **THEN** ve un texto que explica para qué sirve la lista y el formulario para crear la primera tarea

#### Scenario: Se crea la primera
- **WHEN** la persona crea la primera tarea desde el estado vacío
- **THEN** el estado vacío desaparece y ve la tarea en la lista

### Requirement: Creación de tarea desde la lista

La aplicación web SHALL ofrecer en la lista un formulario de creación que pide únicamente el título y que no ofrece ni sugiere responsable, estado ni fecha.

#### Scenario: Un campo y un botón
- **WHEN** una persona abre la lista
- **THEN** el formulario de creación tiene un único campo, el título, y un botón para crear, sin controles de responsable, estado ni fecha

#### Scenario: Crear con un título
- **WHEN** la persona escribe un título y crea la tarea
- **THEN** la tarea aparece en la lista sin recargar la página ni navegar a otra pantalla, en «Pendiente» y con su nombre como responsable, y el campo queda vacío para anotar otra

#### Scenario: Envío en curso
- **WHEN** se está enviando la creación, ya sea con el botón o pulsando Intro en el campo
- **THEN** no se admite un segundo envío hasta que termina, para no crear la tarea dos veces, y el botón queda deshabilitado

#### Scenario: Se crea pero falla recargar la lista
- **WHEN** la tarea se crea correctamente pero la lista no se puede volver a cargar
- **THEN** el campo queda vacío, la persona ve el aviso de fallo al cargar la lista y no un error de creación, para que no repita la tarea

#### Scenario: Título vacío o en blanco
- **WHEN** la persona intenta crear sin título o con solo espacios
- **THEN** no se crea ninguna tarea y ve junto al campo, en lenguaje corriente, que falta escribir el título

#### Scenario: Título demasiado largo
- **WHEN** la persona intenta crear con un título de más de 255 caracteres
- **THEN** no se crea ninguna tarea, el texto escrito se conserva y ve junto al campo un aviso de que el título se pasa de largo y cuántos caracteres admite

#### Scenario: Error de creación
- **WHEN** la creación falla por un motivo que no es del título
- **THEN** ve un aviso con el motivo en castellano y el texto escrito se conserva

### Requirement: Cambio de estado desde la fila

La aplicación web SHALL permitir cambiar el estado de cualquier tarea desde su propia fila, ofreciendo como únicos destinos «Pendiente», «En curso» y «Hecho», sin abrir la tarea, confirmar en un diálogo ni rellenar campos.

#### Scenario: Cambio inmediato
- **WHEN** una persona elige otro estado en una fila
- **THEN** la fila refleja el nuevo estado de inmediato, sin diálogos de confirmación ni formularios

#### Scenario: Tres destinos
- **WHEN** una persona despliega las opciones de estado de una fila
- **THEN** ve exactamente «Pendiente», «En curso» y «Hecho», con el actual marcado, y al terminar la tarea está en uno solo de ellos

#### Scenario: Tarea de otra persona
- **WHEN** una persona cambia el estado de una fila cuyo responsable es otra
- **THEN** el cambio se aplica igual, sin permiso especial ni advertencia

#### Scenario: Responsable intacto
- **WHEN** se cambia el estado de una tarea
- **THEN** el responsable que muestra la fila no cambia

#### Scenario: El cambio falla
- **WHEN** el servidor rechaza el cambio de estado o no responde
- **THEN** la fila vuelve al estado anterior y la persona ve un aviso con el motivo en castellano

#### Scenario: Cambio en curso en la fila
- **WHEN** hay un cambio de estado de una fila pendiente de respuesta
- **THEN** el selector de esa fila queda deshabilitado hasta que termina, y las demás filas siguen operativas

### Requirement: Acceso y navegación de la lista

La aplicación web SHALL exigir sesión para ver la lista, SHALL llevar a `/tasks` a la persona con sesión que entra o abre una dirección desconocida, y SHALL enlazar entre la lista y el perfil.

#### Scenario: Lista sin sesión
- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** es llevada a `/login` y no ve ninguna tarea

#### Scenario: Destino tras entrar
- **WHEN** una persona inicia sesión o se registra con éxito
- **THEN** ve la lista de tareas

#### Scenario: Pantallas de acceso con sesión
- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** es llevada a `/tasks`

#### Scenario: Dirección desconocida
- **WHEN** una persona con sesión abre una dirección que no existe en la aplicación
- **THEN** es llevada a `/tasks`

#### Scenario: Ir y volver entre lista y perfil
- **WHEN** una persona pulsa el enlace al perfil desde la lista, o el enlace a las tareas desde el perfil
- **THEN** pasa a la otra pantalla sin perder la sesión
