# 1. OpenSpec como fuente de verdad viva del comportamiento

## Estado

Reemplazada el 2027-10-08 por
[0002. Los tests de integración como única fuente de verdad ejecutable](0002-tests-como-fuente-de-verdad-ejecutable.md).

Aceptada. Se registra a posteriori, el 2026-10-08. La práctica está en vigor desde el
2026-08-13, cuando se archivaron los tres primeros changes.

## Contexto

El comportamiento de FlowSync se describe hoy en tres sitios con propósitos distintos:

- `docs/prd/` y `docs/backlog/` contienen el PRD y las historias de usuario (E2, E3).
  Expresan intención: qué se quiere y por qué, con preguntas abiertas (PA-3, PA-7, PA-9…)
  y criterios de aceptación (CA-n).
- `openspec/specs/` contiene una spec por capability: `auth` (19 requirements) y `tasks`
  (32 requirements). Cada requirement se escribe con `SHALL` / `NO SHALL` y lleva sus
  scenarios WHEN/THEN, incluidos códigos HTTP y formas de respuesta.
- `openspec/changes/archive/` guarda los changes ya cerrados. Cada uno tiene
  `proposal.md`, `design.md`, `tasks.md` y una delta-spec por capability tocada, con
  secciones `ADDED` / `MODIFIED` Requirements.

La spec viva de `tasks` no se escribió de una vez. Es la suma ordenada de tres deltas,
todas archivadas el 2026-08-13:

| Change | `tasks` | `auth` |
|---|---|---|
| `add-task-list` | crea la capability: 14 ADDED | 3 MODIFIED, 1 ADDED (la lista pasa a ser la pantalla de entrada) |
| `add-task-due-date` | 11 ADDED, 1 MODIFIED | — |
| `add-task-status-filter` | 7 ADDED, 4 MODIFIED | — |

14 + 11 + 7 = 32: cada requirement vivo de `tasks` puede trazarse hasta el change que lo
introdujo, y los MODIFIED muestran cuándo y por qué cambió. `auth` no tiene esa traza:
su base es anterior a OpenSpec en el repo y solo aparece en el archivo por lo que
`add-task-list` le modificó.

Los proposals cierran decisiones que el PRD dejaba abiertas. Por ejemplo, el límite de
200 caracteres (PA-9), el orden «más recientes primero» (PA-3, de forma provisional) y
las transiciones libres entre estados (PA-7). Esas decisiones no existen en ningún otro
sitio.

Ya hemos pagado el coste de no tener una fuente de verdad clara. FS-142 (filtro por
estado) se implementó sin tocar `openspec/`. Durante un tiempo el código filtraba y la
spec viva seguía afirmando «SHALL devolver todas las tareas del espacio». El change
`add-task-status-filter` (commit `209df12`) se escribió después del código, solo para que
el contrato dijera lo que el sistema hacía.

## Decisión

La fuente de verdad del comportamiento observable de FlowSync, API e interfaz, es
`openspec/specs/`. Solo cambia a través de delta-specs:

1. Todo cambio de comportamiento entra como un change en `openspec/changes/<nombre>/`.
   Su delta-spec dice qué requirements se añaden, cuáles se modifican (con el texto
   completo resultante) y cuáles se retiran.
2. Al cerrar el change se archiva. El archivado funde la delta en `openspec/specs/` y
   mueve el change a `openspec/changes/archive/AAAA-MM-DD-<nombre>/` como registro
   histórico, que no se vuelve a editar.
3. Si código y spec viva discrepan, la spec manda. O se arregla el código, o se abre un
   change que cambie la spec. Nunca se corrige uno sin el otro.
4. El PRD y el backlog siguen siendo la fuente de la intención. Un change cita las
   historias y CA que implementa y deja escrito cuáles no cubre.
5. Los artefactos derivados, como `docs/architecture.md` o el documento OpenAPI servido en
   `/api.json`, describen lo que hace el código. Cuando contradicen la spec, el defecto está
   en el código o en ellos, no en la spec.

## Consecuencias

### Lo que ganamos

- **Un solo sitio donde preguntar qué debe hacer el sistema.** Hay un documento por
  capability, en un formato verificable (`SHALL` y scenarios con códigos y formas de
  respuesta), en vez de reconstruir el contrato a partir de historias, código y commits.
- **Historia de decisiones con su porqué.** Los requirements MODIFIED y los proposals
  archivados explican por qué la lista dejó de ser «todas», o por qué vencer hoy no es
  estar vencida. `git log` no da ese contexto.
- **Los tests tienen contra qué escribirse.** Los tests de `tests/functional/tasks/`
  salen de un requirement concreto («Lo que cada tarea muestra de su responsable»). Cuando
  fallan, la spec decide si el fallo está en el código o en el test.
- **Las revisiones tienen un criterio objetivo.** Para revisar un PR o el documento
  OpenAPI basta con contrastarlo con los scenarios, sin depender de la memoria de nadie.

### Lo que nos cuesta

- **Nada obliga a cumplir la spec.** Es texto, y lo único que la conecta con el código son
  los tests que alguien escriba. Los tres changes archivados declaran explícitamente
  «sin tests». El de filtro marcó como verificado a mano (tarea 2.4) que un estado
  inventado devuelve `422`. Cinco días después, el commit `8c15707` («aceptar el filtro
  como texto y dejar de acoplarlo al enum») cambió el validador a
  `vine.string().optional()`. Hoy `GET /api/v1/tasks?status=archivado` responde
  `200 {"data": []}`, y la spec viva sigue exigiendo `422`. Nadie se dio cuenta hasta que
  contrastamos el documento OpenAPI con la spec. Declarar la spec fuente de verdad no la
  hace verdadera: hace que la discrepancia sea un bug con nombre, pero solo si alguien la
  busca.
- **La disciplina recae en las personas.** El caso de FS-142 muestra que basta con una
  implementación hecha por otra vía para que la spec mienta. La regla 3 solo funciona si
  cada PR que toca comportamiento lleva su change, y hoy no hay ninguna comprobación
  automática que lo exija.
- **Ceremonia por cambio.** Cada change pide proposal, design, tasks y delta-spec. Para un
  ajuste pequeño es desproporcionado, y la tentación de saltárselo es justo la que produce
  la deriva anterior.
- **Los MODIFIED reescriben requirements enteros.** Modificar un requirement obliga a
  copiar su texto completo con todos sus scenarios. Un scenario olvidado al copiar
  desaparece de la spec viva sin que el diff de la delta lo haga evidente.
- **El archivo no se lee solo.** Una delta archivada describe el sistema en su momento,
  no el actual. `add-task-list` sigue diciendo que la lista devuelve todas las tareas.
  Para reconstruir el estado hay que aplicar las deltas en orden, y las tres tienen la
  misma fecha: el orden solo se deduce de git.
- **Trazabilidad incompleta.** `auth` no tiene change de origen, así que sus 19
  requirements no pueden trazarse hasta ninguna decisión archivada.
- **Hay que mantener a mano otros contratos.** El documento OpenAPI y
  `docs/architecture.md` describen el mismo sistema desde otro ángulo, y nada los sincroniza
  con la spec. Cada contraste es manual, y los huecos que encuentra (como el `422` de
  arriba) hay que llevarlos a mano a un change o a un arreglo de código.
- **Dependencia de la herramienta.** El flujo depende del CLI de OpenSpec y de sus
  skills (`openspec-propose`, `openspec-apply-change`, `openspec-archive-change`…). Si el
  formato del schema `spec-driven` cambia, también cambia la forma de nuestras specs.
