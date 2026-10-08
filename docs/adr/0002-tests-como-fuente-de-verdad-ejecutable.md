# 2. Los tests de integración como única fuente de verdad ejecutable

## Estado

Aceptada el 2027-10-08. Reemplaza a
[0001. OpenSpec como fuente de verdad viva](0001-openspec-como-fuente-de-verdad.md).

> Este ADR se redactó el 2026-10-08 como escenario supuesto: «dentro de un año dejamos
> de mantener OpenSpec». El contexto solo usa hechos comprobables del repositorio en
> esa fecha. No inventa nada de lo que ocurra durante ese año.

## Contexto

El [ADR 0001](0001-openspec-como-fuente-de-verdad.md) hizo de `openspec/specs/` la fuente
de verdad del comportamiento, modificada solo a través de delta-specs. Entre sus costes ya
anotaba el principal: nada obliga a que el código cumpla la spec. Ese coste se ha
materializado así:

- **La spec puede afirmar algo que el código no hace, y nadie se entera.** El change
  `add-task-status-filter` exige `422` ante un estado inventado y marcó esa comprobación
  como hecha a mano. El commit `8c15707` relajó el validador a `vine.string().optional()`
  y `GET /api/v1/tasks?status=archivado` pasó a responder `200 {"data": []}`. La
  discrepancia apareció al contrastar a mano el documento OpenAPI con la spec. No la
  detectó ninguna ejecución.
- **El código puede hacer algo que la spec no dice.** FS-142 se implementó sin tocar
  `openspec/`, y la spec viva siguió afirmando «todas las tareas» hasta que se documentó
  después (`209df12`).
- **Lo único que sí detectó un fallo fue un test.** Los tests de
  `tests/functional/tasks/assignee.spec.ts` descubrieron que `TaskTransformer` exponía el
  email del responsable, contra lo que la spec decía. La spec llevaba ese requirement desde
  el principio y no lo impidió. El test lo detectó en su primera ejecución.
- Los tres changes archivados se cerraron «sin tests» por decisión explícita. Mantener la
  spec costaba una ceremonia por cambio (proposal, design, tasks, delta-spec y archivado)
  y no daba ninguna garantía a cambio.

Ya existe la base para que los tests asuman ese papel. La suite `functional` de Japa
prueba la API por HTTP real, con el cliente tipado por el registro Tuyau. Cada grupo se
aísla con `testUtils.db().withGlobalTransaction()`. Hay tests de `auth` (registro, login,
sesión, iniciales) y del responsable en `tasks`.

## Decisión

1. **La fuente de verdad del comportamiento de la API son los tests de integración**
   (`backend/tests/functional/`). Si un comportamiento no tiene un test que falle cuando
   cambia, no forma parte del contrato.
2. **Cada test se lee como un requisito.** Los grupos se nombran por capability y
   requisito (`Tasks | responsable`). Los títulos describen la conducta observable en
   castellano, incluidos códigos HTTP y formas de respuesta. Los comportamientos que
   prohíben algo («no expone el email», «un estado inventado no devuelve lista vacía») se
   escriben como aserciones negativas explícitas.
3. **Cuando un test falla, se corrige el código, no el test.** Un test solo se cambia si
   cambia la decisión de producto. Ese cambio va en su propio commit, y el PR explica qué
   se decidió y por qué.
4. **`openspec/` se congela, pero no se borra.** No se abren changes nuevos ni se archivan
   más. Las specs y el archivo se quedan como registro histórico de las decisiones hasta
   esta fecha. Un `README` en `openspec/` avisará de que ya no describen el sistema.
5. **Los requisitos vigentes de la spec congelada se trasladan a tests antes de darla por
   muerta.** Se empieza por los que hoy sabemos rotos, como el `422` del filtro por estado.
   Mientras no tengan test, siguen en la spec congelada como deuda señalada, no como
   contrato.
6. **La intención sigue fuera de los tests.** El porqué de cada decisión de producto vive
   en `docs/prd/`, `docs/backlog/`, los ADR y la descripción de los PR. Los tests dicen
   qué hace el sistema, no por qué.

## Consecuencias

### Lo que ganamos

- **Una discrepancia entre contrato y código rompe la suite.** El caso del filtro
  (`8c15707`) habría fallado en el mismo commit que lo introdujo.
- **Un solo artefacto en vez de dos.** Ya no hay que escribir el comportamiento en una
  spec y luego otra vez en un test. Desaparece la ceremonia por change.
- **Contrato tipado.** Los tests usan el cliente generado desde las rutas y los
  transformers reales, así que un cambio de forma en la respuesta se nota al compilar o
  al ejecutar.

### Lo que nos cuesta

- **Lo que no está probado deja de estar especificado, y eso no se ve.** Una spec con un
  hueco se lee y el hueco se nota. Una suite con un hueco solo pasa en verde. Hoy hay
  muchos más requirements en la spec (32 de `tasks`) que comportamientos cubiertos por
  tests.
- **La interfaz se queda sin fuente de verdad.** 15 de los 32 requirements de `tasks` son
  de pantalla: filtro en la URL, mensajes de vacío distintos, «Sin nombre»,
  señal de vencida sin depender del color… El frontend no tiene runner de tests. Mientras
  no se añada uno, esos requisitos no tienen sitio ni ejecutable ni escrito.
- **Quien cambia el código puede cambiar el test.** La regla 3 se apoya en la disciplina,
  igual que la regla 3 del ADR 0001. Lo que cambia es que ahora la trampa es más fácil de
  ver en un diff, no que sea imposible.
- **Se pierde el porqué junto al qué.** Los requirements de OpenSpec llevaban su
  justificación al lado («vencer hoy todavía no es estar vencida, porque la regla exige
  que la fecha sea anterior»). En un test esa explicación solo sobrevive como comentario,
  y los comentarios se pudren.
- **Producto ya no puede leer el contrato.** Una spec en castellano con WHEN/THEN la podía
  revisar alguien que no programa. Un fichero `.spec.ts` no.
- **Los requisitos de «no existe» cuestan más de probar.** Scenarios como «no existe
  ninguna operación para crear un estado» o «no hay forma de acotar por responsable»
  necesitan tests que recorran la tabla de rutas o los parámetros aceptados, y esos tests
  son más frágiles que una frase.
- **La suite pasa a ser crítica, y no tiene red.** Hoy no hay CI en el repositorio: si
  nadie ejecuta `npm test`, la fuente de verdad no se consulta. La base de datos de los
  tests es además el mismo fichero SQLite del servidor de desarrollo, y un grupo sin
  `withGlobalTransaction()` contamina los dos.
- **Queda un archivo que miente.** `openspec/` congelado irá divergiendo del sistema. Si
  alguien, persona o agente, lo lee sin ver el aviso, trabajará contra un contrato
  caducado. Las skills `openspec-*` de `.claude/` seguirán disponibles y habrá que
  retirarlas o marcarlas.
- **El documento OpenAPI sigue siendo un tercer contrato manual.** Describe lo que el
  código anota, no lo que los tests comprueban, y nada los sincroniza.
