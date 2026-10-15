import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { explainDifference, renderDocument, versionedDocumentPath } from '#openapi/document'

export default class OpenapiCheck extends BaseCommand {
  static commandName = 'openapi:check'
  static description =
    'Regenera el documento OpenAPI en un directorio temporal y falla si difiere de docs/api/openapi.json'

  static options: CommandOptions = { startApp: true }

  /**
   * Solo compara. El fichero versionado no se abre para escribir en ningún
   * punto: arreglarlo es cosa de `openapi:generate`, a propósito, para que una
   * comprobación en CI no pueda dar por bueno un contrato que nadie revisó.
   */
  async run() {
    const versionedPath = versionedDocumentPath(this.app)

    let versioned: string
    try {
      versioned = await readFile(versionedPath, 'utf-8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      this.logger.error(`No existe ${versionedPath}`)
      this.logger.info('Genéralo con `npm run openapi:generate` y commitéalo.')
      this.exitCode = 1
      return
    }

    // Se escribe y se vuelve a leer a propósito: lo que se compara es el
    // fichero que `openapi:generate` habría producido, no una cadena en memoria.
    const workDir = await mkdtemp(join(tmpdir(), 'flowsync-openapi-'))
    try {
      const generatedPath = join(workDir, 'openapi.json')
      await writeFile(generatedPath, await renderDocument(this.app))
      const generated = await readFile(generatedPath, 'utf-8')

      if (generated === versioned) {
        this.logger.success('docs/api/openapi.json coincide con el documento que genera el código')
        return
      }

      let differences: string[]
      try {
        differences = explainDifference(versioned, generated)
      } catch (error) {
        this.logger.error((error as Error).message)
        this.logger.info('Regenéralo con `npm run openapi:generate` y commitea el diff.')
        this.exitCode = 1
        return
      }

      this.logger.error('docs/api/openapi.json no coincide con el documento que genera el código')
      this.logger.log(`  ${differences.length} diferencia(s):`)
      for (const line of differences) this.logger.log(`  ${line}`)
      this.logger.log('')
      this.logger.log('  `-` sobra en el versionado, `+` falta en él, `~` cambia de valor.')
      this.logger.info(
        'Si el cambio es intencionado: `npm run openapi:generate` y commitea el diff.'
      )
      this.exitCode = 1
    } finally {
      await rm(workDir, { recursive: true, force: true })
    }
  }
}
