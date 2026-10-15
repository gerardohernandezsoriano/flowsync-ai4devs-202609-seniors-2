import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { renderDocument, versionedDocumentPath } from '#openapi/document'

export default class OpenapiGenerate extends BaseCommand {
  static commandName = 'openapi:generate'
  static description = 'Genera el documento OpenAPI y lo escribe en docs/api/openapi.json'

  // Las rutas se registran al arrancar la app: sin ella no hay nada que documentar.
  static options: CommandOptions = { startApp: true }

  async run() {
    const target = versionedDocumentPath(this.app)

    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await renderDocument(this.app))

    this.logger.success(`Documento OpenAPI escrito en ${target}`)
  }
}
