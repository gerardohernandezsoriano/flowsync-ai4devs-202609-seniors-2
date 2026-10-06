---
name: verify
description: Recipe to launch FlowSync (API + web) in isolation and drive it in a real browser to verify a change.
---

# Verificar FlowSync en ejecución

Monorepo sin raíz: backend (AdonisJS, :3333) y frontend (Vite, :5173). No uses la base de desarrollo (`backend/tmp/db.sqlite3`, compartida y con una migración `add_role_to_users` marcada como corrupta): trabaja sobre una copia.

## Levantar en aislado (scratchpad)
1. Copiar el backend sin `node_modules`, `tmp` ni `build`: `tar --exclude=node_modules --exclude=tmp --exclude=build -cf - . | tar -xf - -C $S/t`, enlazar `node_modules` del original, `mkdir tmp` y `node ace migration:run` (base nueva).
2. API: `cd $S/t && PORT=3996 node ace serve` (el primer arranque regenera `.adonisjs/`; `list:routes` y `typecheck` fallan hasta entonces).
3. Web: `cd frontend && VITE_API_URL=http://localhost:3996 npx vite --port 5199 --strictPort`. CORS está abierto en desarrollo.

## Manejar el navegador
No hay Playwright en el proyecto. Instalar `puppeteer-core` en una carpeta del scratchpad (no en el repo) y lanzar `/usr/bin/google-chrome` con `headless: 'new'` y `--no-sandbox`. Los inputs de React necesitan el setter nativo de `value` + evento `input` para rellenarlos con texto largo.

## Flujos que merece la pena recorrer
Registro → `/tasks` → estado vacío → crear (en blanco, 256 caracteres, correcto, doble Intro) → tarea de otra cuenta creada por API → cambiar estado (y al parar el API, reversión con aviso) → enlaces lista/perfil → rutas desconocidas y `/login` con sesión.

## Trampas
- **Teclado muerto tras un login por formulario:** después de enviar el formulario de login, Chrome headless deja de entregar teclas a la página (el aviso de guardar contraseña). Lanzar con `--password-store=basic --disable-features=PasswordManagerOnboarding --disable-save-password-bubble` y, mejor, iniciar sesión por API y guardar el token en `localStorage` bajo `flowsync.token` antes de ir a `/tasks`.
- **Campo `type=date`:** `page.focus()` deja el foco en el último segmento; para teclear `mmddyyyy` hay que hacer clic en el segmento del mes (`offset: { x: 22, y: 14 }`). Un valor vacío puede ser borrado o incompleto.
- **Firefox:** `puppeteer.launch({ browser: 'firefox', executablePath: '/usr/bin/firefox', headless: true, protocol: 'webDriverBiDi', userDataDir: '~/snap/firefox/common/<carpeta>' })` (el Firefox de snap no puede usar perfiles fuera de su carpeta); `request.postData()` no está soportado en BiDi.
- Parar el API y recargar vuelve a `/login` (la sesión no se puede validar): no es un fallo.
- No usar `pkill -f "ace serve"`: puede matar tu propia shell. Matar por puerto con `ss -ltnp`.
- Dejar los servidores parados al terminar.
