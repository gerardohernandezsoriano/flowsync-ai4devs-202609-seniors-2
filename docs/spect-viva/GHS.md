# Cuentas y acceso

## Propósito

Esta capacidad permite que una persona cree una cuenta, demuestre quién es para entrar en la aplicación, y que el sistema recuerde y proteja esa identidad mientras la usa. Sin ella no habría forma de distinguir ni resguardar los datos de cada persona dentro de la aplicación.

## Requisitos

### Requisito: Registro de una cuenta nueva

El sistema SHALL permitir que una persona visitante cree una cuenta aportando un email, una contraseña y su confirmación, con el nombre completo como dato opcional.

##### Escenario: Alta con todos los datos válidos

- **WHEN** una persona visitante rellena el formulario de registro con un nombre completo, un email que no pertenece a ninguna cuenta existente y una contraseña de entre 8 y 32 caracteres repetida igual en la confirmación, y lo envía
- **THEN** la cuenta queda creada, la persona pasa a estar autenticada sin tener que iniciar sesión aparte, y es llevada a la pantalla de perfil con sus datos

##### Escenario: Alta sin nombre completo

- **WHEN** una persona visitante envía el formulario de registro dejando vacío el nombre completo, con un email libre y contraseñas coincidentes
- **THEN** la cuenta se crea igualmente, la persona queda autenticada, y la pantalla de perfil la muestra como "Sin nombre"

##### Escenario: Email ya registrado

- **WHEN** una persona visitante intenta registrarse con un email que ya pertenece a otra cuenta
- **THEN** el registro se rechaza y se muestra bajo el campo de email el aviso de que ese email ya está registrado, sugiriendo iniciar sesión en su lugar

##### Escenario: Formato de email inválido

- **WHEN** una persona visitante envía el formulario de registro con un texto que no tiene forma de dirección de email
- **THEN** el registro se rechaza y se muestra bajo el campo de email el aviso de que debe introducir una dirección de email válida

##### Escenario: Contraseña fuera del rango permitido

- **WHEN** una persona visitante envía una contraseña con menos de 8 caracteres o con más de 32
- **THEN** el registro se rechaza y se muestra bajo el campo de contraseña el aviso con el mínimo o el máximo de caracteres permitido

##### Escenario: Confirmación de contraseña que no coincide

- **WHEN** una persona visitante escribe en la confirmación un valor distinto a la contraseña, ya sea que se detecte antes de enviar el formulario o al enviarlo
- **THEN** el registro no se completa y se muestra bajo el campo de confirmación el aviso de que las contraseñas no coinciden

##### Escenario: Campo obligatorio sin rellenar

- **WHEN** una persona visitante envía el formulario de registro sin rellenar el email o sin rellenar la contraseña
- **THEN** el registro se rechaza y se muestra bajo el campo correspondiente el aviso de que falta rellenarlo

### Requisito: Inicio de sesión con una cuenta existente

El sistema SHALL permitir que una persona con una cuenta ya creada inicie sesión con su email y su contraseña.

##### Escenario: Credenciales correctas

- **WHEN** una persona introduce el email y la contraseña de una cuenta existente y ambos coinciden con los registrados
- **THEN** queda autenticada y es llevada a la pantalla de perfil con sus datos

##### Escenario: Email o contraseña incorrectos

- **WHEN** una persona introduce un email y una contraseña que, juntos, no coinciden con ninguna cuenta existente
- **THEN** el inicio de sesión se rechaza y se muestra un único aviso general de que el email o la contraseña no son correctos, sin señalar cuál de los dos falló

##### Escenario: Formato de email inválido

- **WHEN** una persona introduce en el campo de email un texto que no tiene forma de dirección de email y envía el formulario
- **THEN** el inicio de sesión se rechaza y se muestra bajo el campo de email el aviso de formato inválido

##### Escenario: Campo obligatorio sin rellenar

- **WHEN** una persona envía el formulario de inicio de sesión sin rellenar el email o sin rellenar la contraseña
- **THEN** el inicio de sesión se rechaza y se muestra bajo el campo correspondiente el aviso de que falta rellenarlo

### Requisito: Persistencia y restauración automática de la sesión

El sistema SHALL mantener a una persona autenticada entre visitas mientras su sesión siga siendo válida, sin pedirle credenciales de nuevo.

##### Escenario: Sesión guardada todavía válida

- **WHEN** una persona vuelve a abrir la aplicación teniendo una sesión iniciada previamente en el mismo navegador, y esa sesión sigue siendo válida
- **THEN** accede directamente a la pantalla de perfil sin pasar por el inicio de sesión, viendo mientras tanto una pantalla de carga durante la comprobación

##### Escenario: Sesión guardada que ya no es válida

- **WHEN** una persona vuelve a abrir la aplicación con una sesión guardada que el sistema ya no reconoce como válida
- **THEN** la sesión se cierra automáticamente y se le lleva a la pantalla de inicio de sesión con un aviso explicando que debe volver a iniciar sesión

##### Escenario: Sistema no disponible al restaurar la sesión

- **WHEN** una persona vuelve a abrir la aplicación con una sesión guardada y el sistema no responde o falla al comprobarla
- **THEN** se le trata como no autenticada por el momento y se le lleva a la pantalla de inicio de sesión con un aviso de que no se ha podido restaurar la sesión, sin darla por cerrada de forma definitiva

### Requisito: Cierre de sesión

El sistema SHALL permitir que una persona autenticada cierre su sesión desde la pantalla de perfil.

##### Escenario: Cierre de sesión con el sistema disponible

- **WHEN** una persona autenticada pulsa cerrar sesión en la pantalla de perfil
- **THEN** deja de estar autenticada y es llevada a la pantalla de inicio de sesión

##### Escenario: Cierre de sesión con el sistema no disponible

- **WHEN** una persona autenticada pulsa cerrar sesión en la pantalla de perfil mientras el sistema no responde
- **THEN** localmente deja de estar autenticada igualmente y es llevada a la pantalla de inicio de sesión

### Requisito: Acceso a las pantallas según el estado de la sesión

El sistema SHALL restringir las pantallas de la aplicación según si quien las visita tiene o no una sesión activa.

##### Escenario: Visitante sin sesión intenta ver el perfil

- **WHEN** alguien sin sesión activa intenta acceder a la pantalla de perfil
- **THEN** es redirigido a la pantalla de inicio de sesión

##### Escenario: Persona autenticada intenta ver inicio de sesión o registro

- **WHEN** una persona con sesión activa intenta acceder a la pantalla de inicio de sesión o a la de registro
- **THEN** es redirigida a la pantalla de perfil

##### Escenario: Dirección desconocida

- **WHEN** alguien visita una dirección de la aplicación que no corresponde a ninguna pantalla conocida
- **THEN** se le redirige a la pantalla de perfil, que a su vez la lleva a inicio de sesión si no tiene sesión activa

### Requisito: Visualización de los datos de la cuenta propia

El sistema SHALL mostrar a la persona autenticada los datos de su propia cuenta en la pantalla de perfil.

##### Escenario: Cuenta con nombre completo

- **WHEN** una persona autenticada con un nombre completo guardado abre la pantalla de perfil
- **THEN** ve su nombre completo, sus iniciales, su email y la fecha en la que se dio de alta

##### Escenario: Cuenta sin nombre completo

- **WHEN** una persona autenticada que no rellenó un nombre completo abre la pantalla de perfil
- **THEN** ve el texto "Sin nombre" en lugar de un nombre, y sus iniciales se calculan a partir de su email
