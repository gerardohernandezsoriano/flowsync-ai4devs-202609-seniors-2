# auth Specification

## Purpose

Permitir que una persona cree una cuenta, inicie y cierre sesión y consulte su perfil, tanto a través de la API HTTP como desde las pantallas de acceso de la aplicación web. Documenta el comportamiento vigente del sistema.

## Requirements

### Requirement: Registro de cuenta por API

El sistema SHALL crear una cuenta nueva y abrir sesión en la misma respuesta cuando `POST /api/v1/auth/signup` recibe `fullName` (texto o `null`), `email`, `password` y `passwordConfirmation` válidos.

#### Scenario: Registro correcto
- **WHEN** se envía una petición de registro con un email que no existe, una contraseña de 8 a 32 caracteres y una confirmación idéntica
- **THEN** el sistema responde 200 con `data.user` (con `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`) y `data.token`, y la respuesta no contiene la contraseña

#### Scenario: Registro sin nombre
- **WHEN** se envía una petición de registro válida con `fullName` a `null`
- **THEN** el sistema crea la cuenta y devuelve `data.user.fullName` a `null`

#### Scenario: Nombre vacío o en blanco
- **WHEN** se envía una petición de registro válida con `fullName` como texto vacío o solo espacios
- **THEN** el sistema crea la cuenta y devuelve `data.user.fullName` a `null`

#### Scenario: Email sin normalizar
- **WHEN** se envía una petición de registro con un email con mayúsculas, como "Ada@Example.com"
- **THEN** el sistema lo guarda y lo devuelve tal cual, sin pasarlo a minúsculas

### Requirement: Validación del registro

El sistema SHALL rechazar con 422 los registros que incumplan las reglas de email y contraseña, y SHALL NOT crear ninguna cuenta en ese caso. Cada error de la respuesta (`errors`) indica el `field` afectado y la `rule` incumplida.

#### Scenario: Email ya registrado
- **WHEN** se envía una petición de registro con un email que ya pertenece a otra cuenta
- **THEN** el sistema responde 422 con un error sobre `email` cuya regla es `database.unique`

#### Scenario: Email con formato inválido o demasiado largo
- **WHEN** se envía una petición de registro con un email sin formato de dirección válida o de más de 254 caracteres
- **THEN** el sistema responde 422 con un error sobre `email`

#### Scenario: Contraseña fuera de longitud
- **WHEN** se envía una petición de registro con una contraseña de menos de 8 o de más de 32 caracteres
- **THEN** el sistema responde 422 con un error sobre `password`; si la confirmación tiene también longitud inválida, el error se repite sobre `passwordConfirmation`

#### Scenario: Confirmación distinta
- **WHEN** se envía una petición de registro cuyo `passwordConfirmation` no coincide con `password`
- **THEN** el sistema responde 422 con un error sobre `passwordConfirmation` cuya regla es `sameAs`

#### Scenario: Campos obligatorios ausentes
- **WHEN** se envía una petición de registro en la que falta la clave `fullName`, `email`, `password` o `passwordConfirmation`
- **THEN** el sistema responde 422 con un error de regla `required` sobre cada campo ausente (`fullName` es obligatorio como clave, aunque su valor pueda ser `null`)

### Requirement: Inicio de sesión por API

El sistema SHALL emitir un token de acceso cuando `POST /api/v1/auth/login` recibe un email y una contraseña que corresponden a una cuenta existente.

#### Scenario: Credenciales correctas
- **WHEN** se envía una petición de login con el email y la contraseña de una cuenta
- **THEN** el sistema responde 200 con `data.user` y un `data.token` nuevo que sirve para autenticar peticiones posteriores

#### Scenario: Varios inicios de sesión
- **WHEN** una misma cuenta inicia sesión dos veces
- **THEN** el sistema devuelve un token distinto en cada ocasión y ambos permiten autenticarse mientras no se cierren

#### Scenario: Credenciales incorrectas
- **WHEN** se envía una petición de login con un email inexistente o con una contraseña que no corresponde a la cuenta
- **THEN** el sistema responde 400 sin emitir token, y la respuesta no distingue si falló el email o la contraseña

#### Scenario: Datos de login mal formados
- **WHEN** se envía una petición de login sin `password`, o con un `email` sin formato de dirección válida
- **THEN** el sistema responde 422 con un error sobre el campo afectado

### Requirement: Consulta del perfil propio

El sistema SHALL devolver los datos de la persona autenticada en `GET /api/v1/account/profile` cuando la petición lleva un token válido en la cabecera `Authorization: Bearer`.

#### Scenario: Perfil con token válido
- **WHEN** se pide el perfil con un token emitido por el registro o el login
- **THEN** el sistema responde 200 con `data` (con `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`) y sin contraseña

#### Scenario: Iniciales a partir del nombre
- **WHEN** la cuenta tiene un nombre completo de al menos dos palabras separadas por un único espacio
- **THEN** `initials` son en mayúsculas las primeras letras de las dos primeras palabras (por ejemplo, "Ada Lovelace" da "AL")

#### Scenario: Iniciales sin nombre completo
- **WHEN** la cuenta no tiene nombre completo
- **THEN** `initials` son en mayúsculas la primera letra de la parte local del email más la primera letra de su dominio (por ejemplo, "b@example.com" da "BE"; comportamiento observado, probablemente no intencionado)

#### Scenario: Nombre de una sola palabra
- **WHEN** la cuenta tiene un nombre completo de una sola palabra
- **THEN** `initials` son en mayúsculas las dos primeras letras de esa palabra

#### Scenario: Nombre con espacios dobles
- **WHEN** la cuenta tiene un nombre como "Ada  Lovelace", con dos espacios entre palabras
- **THEN** `initials` son en mayúsculas las dos primeras letras de la primera palabra ("AD"), no las de ambas palabras

### Requirement: Cierre de sesión por API

El sistema SHALL invalidar el token usado cuando `POST /api/v1/account/logout` se recibe con un token válido.

#### Scenario: Logout correcto
- **WHEN** se envía una petición de logout con un token válido
- **THEN** el sistema responde 200 con el cuerpo `{ "message": "Logged out successfully" }`

#### Scenario: Token invalidado
- **WHEN** se usa en cualquier endpoint protegido un token con el que ya se cerró sesión
- **THEN** el sistema responde 401

#### Scenario: Otras sesiones intactas
- **WHEN** una cuenta cierra sesión con uno de sus tokens teniendo otros emitidos
- **THEN** los demás tokens de la cuenta siguen autenticando

### Requirement: Protección de los endpoints de cuenta

El sistema SHALL responder 401 a las peticiones sin autenticación válida sobre `GET /api/v1/account/profile` y `POST /api/v1/account/logout`. Los endpoints de registro y login SHALL ser accesibles sin autenticación.

#### Scenario: Sin cabecera de autorización
- **WHEN** se pide el perfil o se hace logout sin cabecera `Authorization`
- **THEN** el sistema responde 401

#### Scenario: Token desconocido
- **WHEN** se pide el perfil con un token que el sistema no reconoce
- **THEN** el sistema responde 401

#### Scenario: Registro y login sin token
- **WHEN** se llama a registro o login sin cabecera `Authorization`
- **THEN** el sistema procesa la petición con normalidad

### Requirement: Respuestas siempre en JSON

El sistema SHALL responder en JSON a las peticiones de la API de autenticación, también en caso de error, aunque la petición no declare que acepta JSON.

#### Scenario: Error sin cabecera Accept
- **WHEN** se pide el perfil sin token y sin cabecera `Accept`
- **THEN** el sistema responde 401 con un cuerpo JSON y no con una página HTML ni una redirección

### Requirement: Pantalla de registro

La aplicación web SHALL ofrecer en `/register` un formulario de registro con los campos "Nombre completo" (opcional), "Email", "Contraseña" (con la indicación "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" hacia el login.

#### Scenario: Registro correcto
- **WHEN** una persona rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** el botón muestra "Creando cuenta…" y deshabilitado durante el envío, y después la persona queda con la sesión iniciada y ve su perfil

#### Scenario: Nombre en blanco
- **WHEN** una persona deja el nombre vacío o solo con espacios y envía el formulario
- **THEN** la cuenta se crea sin nombre y el perfil mostrará "Sin nombre"

#### Scenario: Contraseñas distintas
- **WHEN** una persona escribe contraseñas diferentes en los dos campos y pulsa "Crear cuenta"
- **THEN** ve bajo "Repite la contraseña" el mensaje "Las contraseñas no coinciden." y no se envía nada al servidor

#### Scenario: Email ya registrado
- **WHEN** una persona se registra con un email que ya tiene cuenta
- **THEN** ve bajo el campo "Email" el mensaje "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: Errores de validación en castellano
- **WHEN** el servidor rechaza un campo por email inválido, campo obligatorio vacío o longitud incorrecta
- **THEN** la persona ve bajo ese campo un mensaje en castellano que indica qué debe corregir, por ejemplo "Introduce una dirección de email válida." o "la contraseña debe tener al menos 8 caracteres."

#### Scenario: Error que no corresponde a un campo visible
- **WHEN** el servidor devuelve un error de un campo que la pantalla no muestra, o un error que no es de validación
- **THEN** la persona ve el mensaje en un aviso rojo encima del formulario

### Requirement: Pantalla de inicio de sesión

La aplicación web SHALL ofrecer en `/login` un formulario titulado "Inicia sesión" con los campos "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" hacia el registro.

#### Scenario: Login correcto
- **WHEN** una persona introduce credenciales válidas y pulsa "Entrar"
- **THEN** el botón muestra "Entrando…" y deshabilitado durante el envío, y después la persona ve su perfil

#### Scenario: Credenciales incorrectas
- **WHEN** una persona introduce un email o una contraseña que no corresponden a una cuenta
- **THEN** ve en un aviso rojo "El email o la contraseña no son correctos." y permanece en el formulario

#### Scenario: Servidor inalcanzable
- **WHEN** una persona intenta iniciar sesión y la aplicación no consigue contactar con el servidor
- **THEN** ve en un aviso rojo "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Fallo inesperado del servidor
- **WHEN** el servidor responde con un error que no es de credenciales ni de validación
- **THEN** ve en un aviso rojo "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

#### Scenario: Navegar al registro
- **WHEN** una persona pulsa "Crea una" en el login, o "Inicia sesión" en el registro
- **THEN** pasa a la otra pantalla de acceso

### Requirement: Pantalla de perfil

La aplicación web SHALL mostrar en `/profile` las iniciales, el nombre (o "Sin nombre"), el email y la fecha "Miembro desde" de la persona con sesión, con la fecha en formato largo en castellano, y un botón "Cerrar sesión".

#### Scenario: Perfil con nombre
- **WHEN** una persona con nombre completo abre su perfil
- **THEN** ve sus iniciales en un círculo, su nombre, su email y "Miembro desde" con la fecha de alta, por ejemplo "1 de octubre de 2026"

#### Scenario: Perfil sin nombre
- **WHEN** una persona sin nombre completo abre su perfil
- **THEN** ve "Sin nombre" en lugar del nombre

#### Scenario: Cerrar sesión
- **WHEN** una persona pulsa "Cerrar sesión"
- **THEN** el botón muestra "Cerrando sesión…" y deshabilitado, y la persona llega a la pantalla de login sin sesión

#### Scenario: Cerrar sesión con el servidor caído o el token ya inválido
- **WHEN** una persona pulsa "Cerrar sesión" y el servidor falla o ya no reconoce el token
- **THEN** la persona igualmente sale a la pantalla de login y no queda con la sesión abierta en esa aplicación

### Requirement: Protección y redirección de pantallas

La aplicación web SHALL permitir ver `/profile` solo con sesión iniciada, y `/login` y `/register` solo sin ella. Cualquier otra dirección SHALL llevar a `/profile`.

#### Scenario: Perfil sin sesión
- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a `/login`

#### Scenario: Pantallas de acceso con sesión
- **WHEN** una persona con sesión abre `/login` o `/register`
- **THEN** es llevada a `/profile`

#### Scenario: Dirección desconocida
- **WHEN** una persona abre una dirección que no existe en la aplicación
- **THEN** es llevada a `/profile` y, si no tiene sesión, de ahí a `/login`

#### Scenario: Comprobación de sesión en curso
- **WHEN** la aplicación está comprobando una sesión guardada al cargar
- **THEN** la persona ve un indicador de carga ("Cargando…" para lectores de pantalla) y no es redirigida hasta que termina la comprobación

### Requirement: Persistencia y restauración de la sesión

La aplicación web SHALL conservar la sesión iniciada al recargar la página o volver a abrirla en el mismo navegador, comprobándola contra el servidor antes de darla por válida.

#### Scenario: Recarga con sesión válida
- **WHEN** una persona con sesión recarga la aplicación
- **THEN** vuelve a ver su perfil sin tener que iniciar sesión de nuevo

#### Scenario: Sesión caducada o rechazada
- **WHEN** al cargar la aplicación el servidor rechaza la sesión guardada
- **THEN** la persona es llevada a `/login` y ve en un aviso rojo "Tu sesión ha caducado. Vuelve a iniciar sesión.", y la sesión guardada se descarta de modo que recargas posteriores no vuelven a mostrarlo

#### Scenario: Servidor caído al restaurar
- **WHEN** al cargar la aplicación el servidor no responde o falla con un error distinto de rechazo del token
- **THEN** la persona es llevada a `/login` con un aviso rojo que explica el fallo, y al recargar cuando el servidor vuelva recupera su sesión sin volver a introducir credenciales

#### Scenario: Nueva sesión limpia el aviso
- **WHEN** una persona inicia sesión con éxito tras ver un aviso de sesión perdida
- **THEN** el aviso desaparece
