# Instrucciones de revisión

Solo para quien revisa un cambio propuesto. El resto del proyecto está en `CLAUDE.md`.

## Qué es grave

La fuente de verdad es `openspec/specs/<capability>/spec.md`, no el código ni el README.
Es **grave** solo esto, y no tiene tope:

1. El código incumple un scenario de la spec. Cita su título.
2. Fuga de datos o de acceso: un campo de cuenta (email, token, hash) en una respuesta
   que no lo pide, o una ruta de `/api/v1` sin `auth` que la spec da por protegida.
3. Pérdida o corrupción de datos: una migración o escritura que borra o pisa lo que no debe.
4. Una ruta, un campo o un código de estado de `/api/v1` que cambia sin spec que lo respalde.

Todo lo demás **no pasa de sugerencia**: nombres, estructura, refactors, comentarios,
casos límite que ninguna spec menciona, y los tests que faltan (que falten no es un fallo
del cambio, salvo que el cambio rompa uno existente).

## Sugerencias menores

Máximo **3** por revisión, las que más pesen. Del resto, una sola línea al final del
resumen con la cuenta y el tipo (`+5 menores: nombres, comentarios`), sin detallarlas.

## Dónde no reportar

- Lo que ya vigila una comprobación del repositorio:
  - `.adonisjs/` obsoleto o el README de capability sin tocar (`capability-contract.yml`).
  - `docs/api/openapi.json` desfasado del código (`openapi-check.yml`).
- Formato y estilo: Prettier, comillas, punto y coma, orden de imports.
- Código generado: `backend/.adonisjs/`, `backend/database/schema.ts`,
  `frontend/src/components/ui/` y `docs/api/openapi.json`. Revisa su fuente, no el volcado.
- `package-lock.json`, `docs/adr/` y `prompts.md`.

## Cómo afirmar algo

Para decir que el código **se comporta** de una manera, cita `archivo:línea` donde lo
has leído **en esta revisión**. No lo deduzcas del nombre de la función, de un comentario
ni del README: `isOverdueOn` documentaba tres condiciones y el cuerpo comprobaba dos.

Si no lo has leído, o no puedes citar la línea, no lo afirmes: márcalo como
«no verificado» o no lo reportes.
