# Revisor de código en CI

`.github/workflows/claude-review.yml` lanza `anthropics/claude-code-action@v1` en cada PR
(al abrirlo, reabrirlo, marcarlo listo y en cada push). El revisor publica los hallazgos
como comentarios en línea sobre el diff, más un comentario de resumen.

Límites fijados en el workflow: `--model sonnet --effort medium`, `--max-turns 40` y
`timeout-minutes: 10`. Solo tiene herramientas de lectura (`Read`, `Grep`, `Glob`), `gh pr
diff|view|comment` y la de comentarios en línea: no puede editar ni commitear.

## Pasos manuales pendientes

Hasta hacer esto, el workflow existe pero no funciona.

1. **Instalar la GitHub App de Claude** en el repositorio (<https://github.com/apps/claude>,
   o `/install-github-app` desde Claude Code). La acción cambia el token OIDC del job
   (`id-token: write`) por un token de esa app, que es con el que comenta. Sin la app
   instalada no puede comentar. Hace falta ser admin del repo.
2. **Guardar la credencial como secreto del repositorio** (Settings → Secrets and variables
   → Actions). Ver la sección siguiente: el nombre del secreto depende del camino.
3. **Crear `docs/revisor-calibracion.md`.** El prompt le pide al revisor que lo lea antes
   que nada para saber qué es grave y cuántas sugerencias menores caben. Hoy no existe:
   el revisor lo dirá en el resumen y aplicará un tope de tres sugerencias menores.
4. **Subir la rama y abrir un PR** para ver la primera ejecución. El workflow tiene que estar
   en la rama del PR para que se lance.

## Credencial: dos caminos, no intercambiables

Cada camino usa **una entrada distinta** de la acción y **un secreto con un nombre
distinto**. Si cruzas los caminos (un token de suscripción en `anthropic_api_key`, o una
clave de API en `claude_code_oauth_token`), la acción arranca sin quejarse y **falla en la
primera llamada al modelo** con un error de autenticación que no dice que el problema es la
entrada.

### 1. Suscripción (Pro o Max): el que usa el workflow

- Genera el token en local: `claude setup-token`.
- Guárdalo como secreto **`CLAUDE_CODE_OAUTH_TOKEN`**.
- Entrada de la acción: **`claude_code_oauth_token`**. Es la que ya está en el workflow:

  ```yaml
  claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
  ```

- Las ejecuciones gastan del uso incluido en tu plan, con sus límites, y no se facturan por
  token. Si se agota el límite, la revisión falla hasta que se renueva.

### 2. Clave de API de la consola

- Crea la clave en <https://console.anthropic.com/> (empieza por `sk-ant-`).
- Guárdala como secreto **`ANTHROPIC_API_KEY`**.
- Entrada de la acción: **`anthropic_api_key`**. Cambia la línea del workflow por:

  ```yaml
  anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
  ```

- Se factura por token a la organización de la consola.

Pon solo una de las dos entradas.

## En qué se va el dinero

Cada ejecución es una sesión del revisor: lo que cuesta son los tokens que lee (diff,
archivos abiertos, calibración, spec) y los que escribe, multiplicados por los turnos. Y se
lanza **en cada push** a un PR abierto. El `concurrency` del workflow cancela la ejecución
anterior si llega un push nuevo, pero la parte ya consumida se paga igual.

- **Modelo:** `sonnet` (el alias de Claude Code para el Sonnet vigente), con
  `--effort medium`.
- **Por qué ese:** revisar un diff y contrastarlo con la spec es lectura y juicio sobre
  código. Sonnet lo hace con un coste por token claramente menor que Opus, y el esfuerzo
  medio recorta el razonamiento extendido de cada turno. `--max-turns 40` y los 10 minutos
  acotan lo peor que puede costar una ejecución que se atasca.
- **Cómo cambiarlo:** en `claude_args` del workflow. `--model opus` para más profundidad y
  más coste, `--model haiku` para menos. `--effort low|medium|high` cambia cuánto razona.
  `--max-turns` y `timeout-minutes` ponen el techo.
- **Precio:** no lo copio aquí porque cambia. Consulta la página oficial:
  <https://docs.claude.com/en/docs/about-claude/pricing> (API por token) y
  <https://www.anthropic.com/pricing> (planes de suscripción).

## PRs desde un fork en un repositorio público

Con el evento `pull_request`, GitHub **no pasa los secretos del repositorio** a las
ejecuciones lanzadas desde un fork y les da un `GITHUB_TOKEN` de solo lectura. El revisor
no tendrá credencial y el job fallará: esos PRs no se revisan. Además, la acción solo
arranca si quien abre el PR tiene permiso de escritura en el repo.

No lo "arregles" pasando a `pull_request_target`. Ese evento sí corre con los secretos del
repositorio base, y hacer checkout del código del fork en ese contexto le da a código ajeno
acceso a la credencial. Si algún día hace falta revisar forks, sigue `docs/security.md` de
la acción: checkout de la rama base y el head del PR en un subdirectorio pasado con
`--add-dir`.
