import type { ApplicationService } from '@adonisjs/core/types'

/**
 * Dónde vive el contrato versionado: en `docs/` de la raíz del repo, no del
 * backend, porque es documentación del proyecto y no código de la app.
 */
export function versionedDocumentPath(app: ApplicationService) {
  return app.makePath('..', 'docs', 'api', 'openapi.json')
}

/**
 * El documento tal y como se sirve en `/api.json`, serializado de forma
 * estable: misma indentación y salto de línea final, para que dos
 * generaciones sin cambios de código den bytes idénticos.
 */
export async function renderDocument(app: ApplicationService) {
  // Las rutas se registran al cargar `start/routes.ts`, pero no entran en el
  // router hasta que se confirman, y eso lo hace el servidor HTTP al arrancar,
  // que un comando de ace no hace. Sin esto el documento sale con `paths: {}`.
  // `commit()` es idempotente.
  const router = await app.container.make('router')
  router.commit()

  const openapi = await app.container.make('openapi')
  const document = await openapi.buildDocument()

  // Un contrato sin una sola ruta no es un contrato sin cambios, es un fallo al
  // construirlo. Sin esta guarda, `openapi:check` daría verde comparando dos
  // documentos igual de vacíos.
  if (Object.keys(document.paths ?? {}).length === 0) {
    throw new Error('El documento OpenAPI no tiene ninguna ruta: no se han registrado las rutas')
  }

  return `${JSON.stringify(document, null, 2)}\n`
}

type Leaves = Map<string, string>

function flatten(value: unknown, path: string, into: Leaves) {
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      into.set(path, Array.isArray(value) ? '[]' : '{}')
      return
    }
    for (const [key, child] of entries) {
      flatten(child, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`, into)
    }
    return
  }
  into.set(path, JSON.stringify(value))
}

function short(value: string) {
  return value.length > 100 ? `${value.slice(0, 97)}...` : value
}

/**
 * Explica qué rutas del documento difieren, en vez de volcar un diff de
 * líneas de un JSON de cientos de ellas: cada línea es una hoja del documento
 * que sobra, que falta o que ha cambiado de valor.
 *
 * Devuelve una lista vacía si los dos son el mismo documento.
 */
export function explainDifference(versioned: string, generated: string): string[] {
  const parse = (text: string, label: string): unknown => {
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`${label} no es JSON válido`)
    }
  }

  const before: Leaves = new Map()
  const after: Leaves = new Map()
  flatten(parse(versioned, 'El documento versionado'), '$', before)
  flatten(parse(generated, 'El documento generado'), '$', after)

  const lines: string[] = []
  for (const [path, value] of after) {
    if (!before.has(path)) {
      lines.push(`+ ${path} = ${short(value)}   (falta en el versionado)`)
    } else if (before.get(path) !== value) {
      lines.push(`~ ${path}: ${short(before.get(path)!)} -> ${short(value)}`)
    }
  }
  for (const [path, value] of before) {
    if (!after.has(path)) lines.push(`- ${path} = ${short(value)}   (sobra en el versionado)`)
  }

  // Mismo contenido pero distinta forma de escribirlo (indentación, orden de
  // claves, salto final): también cuenta, porque el fichero no sería idéntico.
  if (lines.length === 0 && versioned !== generated) {
    lines.push('El contenido es el mismo, pero el fichero versionado no está serializado igual.')
  }
  return lines
}
