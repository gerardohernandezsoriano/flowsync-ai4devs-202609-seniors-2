# Arquitectura de FlowSync

Este diagrama muestra los contenedores de FlowSync en notación C4: la SPA de React que
usa el equipo, la API de AdonisJS a la que llama por HTTP/JSON y la base de datos SQLite
donde se guardan cuentas, tokens y tareas. Dentro de cada contenedor se ven las piezas que
existen hoy en el código. En el frontend son el cliente de API, el contexto de sesión y
las pantallas. En el backend, los controladores agrupados por ruta, los validadores, los
transformers y los modelos. Solo se dibuja lo verificado en `backend/` y `frontend/`.

```mermaid
C4Container
    title FlowSync — diagrama de contenedores

    Person(user, "Miembro del equipo", "Gestiona la lista de tareas compartida")

    System_Boundary(flowsync, "FlowSync") {
        Container(spa, "Frontend (SPA)", "React 19, Vite, react-router", "Login, registro, lista de tareas, detalle de tarea y perfil. Guarda el token en localStorage (flowsync.token). http://localhost:5173")
        Container(api, "Backend (API REST)", "AdonisJS 7, Lucid, VineJS", "Prefijo /api/v1: auth, account y tasks. Auth por access tokens opacos (Bearer). Respuestas envueltas en { data }. http://localhost:3333")
        ContainerDb(db, "Base de datos", "SQLite (better-sqlite3), tmp/db.sqlite3", "Tablas users, auth_access_tokens y tasks")
    }

    Rel(user, spa, "Usa", "Navegador")
    Rel(spa, api, "Llama a", "HTTP/JSON, Authorization: Bearer")
    Rel(api, db, "Lee y escribe", "Lucid / SQL")
```

## Contenedores por dentro

Los componentes no son contenedores C4 propiamente dichos. Este segundo diagrama usa
`C4Component` para detallar qué hay dentro de cada uno.

```mermaid
C4Component
    title FlowSync — componentes del frontend y del backend

    Container_Boundary(spa, "Frontend (SPA)") {
        Component(routes, "app-routes + guards", "react-router", "/login, /register (solo sin sesión); /tasks, /tasks/:id, /profile (protegidas)")
        Component(pages, "pages/", "React", "login, register, profile, tasks, task")
        Component(authctx, "auth/", "React context", "Token en localStorage; rehidrata la sesión con GET /account/profile")
        Component(apiclient, "lib/api.ts", "fetch", "Único punto de contacto con el backend; desenvuelve { data } y traduce errores a ApiError")
    }

    Container_Boundary(api, "Backend (API REST)") {
        Component(router, "start/routes.ts", "AdonisJS router", "Rutas bajo /api/v1; middleware auth en account y tasks")
        Component(authc, "NewAccount, AccessTokens, Profile", "Controllers", "POST auth/signup, POST auth/login, POST account/logout, GET account/profile")
        Component(tasksc, "Tasks, TaskStatuses, TaskDueDates", "Controllers", "GET/POST tasks, GET tasks/:id, PATCH tasks/:id/status, PUT tasks/:id/due-date")
        Component(validators, "validators/", "VineJS", "user.ts y task.ts")
        Component(transformers, "transformers/", "BaseTransformer", "User, Task, TaskDetail, TaskAssignee")
        Component(models, "models/", "Lucid", "User (con accessTokens) y Task (belongsTo assignee)")
    }

    ContainerDb(db, "SQLite", "tmp/db.sqlite3", "users, auth_access_tokens, tasks")

    Rel(routes, pages, "Renderiza")
    Rel(pages, authctx, "Usa")
    Rel(pages, apiclient, "Llama a")
    Rel(authctx, apiclient, "Llama a")
    Rel(apiclient, router, "HTTP/JSON")
    Rel(router, authc, "Despacha")
    Rel(router, tasksc, "Despacha")
    Rel(authc, validators, "Valida con")
    Rel(tasksc, validators, "Valida con")
    Rel(authc, transformers, "Serializa con")
    Rel(tasksc, transformers, "Serializa con")
    Rel(authc, models, "Usa")
    Rel(tasksc, models, "Usa")
    Rel(models, db, "Lee y escribe", "SQL")
```
