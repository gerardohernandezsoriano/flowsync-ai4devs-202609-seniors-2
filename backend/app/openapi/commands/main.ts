import type { CommandMetaData } from '@adonisjs/core/types/ace'

/**
 * Cargador de comandos registrado en `adonisrc.ts`, con la misma forma que el
 * de los paquetes (`getMetaData` + `getCommand`).
 *
 * Los comandos no viven en `commands/` a propósito: ace escanea ese directorio
 * y valida cada comando con `jsonschema`, que en `jsonschema@1.5.0` lanza
 * «Invalid URL» ante cualquier `$ref` relativo (se reproduce sin ace:
 * `new Validator().validate({}, { $ref: '#/definitions/A', definitions: { A: {} } })`).
 * Un solo fichero ahí rompería `node ace <comando>` para cualquier comando
 * que no esté ya indexado. Los cargadores de paquetes no pasan por esa
 * validación, así que este tampoco.
 *
 * Si algún día se actualiza `jsonschema` y se arregla, estos ficheros pueden
 * moverse a `commands/` y este cargador y su entrada en `adonisrc.ts` sobran.
 */
const commands = {
  'openapi:generate': () => import('./openapi_generate.js'),
  'openapi:check': () => import('./openapi_check.js'),
}

type CommandName = keyof typeof commands

/**
 * Los metadatos salen de las propias clases (`serialize()`), no de un JSON
 * escrito a mano, así que no pueden desincronizarse del comando.
 */
export async function getMetaData(): Promise<CommandMetaData[]> {
  return Promise.all(
    (Object.keys(commands) as CommandName[]).map(async (name) => {
      const { default: command } = await commands[name]()
      return { ...command.serialize(), filePath: `${name}.js` }
    })
  )
}

export async function getCommand(metaData: Pick<CommandMetaData, 'commandName'>) {
  const load = commands[metaData.commandName as CommandName]
  if (!load) return null

  const { default: command } = await load()
  return command
}
