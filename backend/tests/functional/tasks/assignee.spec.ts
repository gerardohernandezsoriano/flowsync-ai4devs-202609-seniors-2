import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: responsable identificable, tarea que no
 * filtra datos de cuenta, y responsable sin nombre.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function sesion(client: any, email = 'mirón@example.com') {
    await User.create({ fullName: 'Quien Mira', email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(fullName: string | null, email: string) {
    const responsable = await User.create({ fullName, email, password: 'secreto123' })

    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace', 'ada@example.com')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}?today=2026-10-08`)
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    const enLista = (lista.body().data as any[]).find((t: any) => t.id === tarea.id)

    for (const assignee of [suelta.body().data.assignee, enLista.assignee]) {
      assert.equal(assignee.fullName, 'Ada Lovelace')
      assert.equal(assignee.initials, 'AL')
    }
  })

  test('la tarea no expone el email ni otros datos de acceso del responsable', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace', 'ada@example.com')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}?today=2026-10-08`)
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    const enLista = (lista.body().data as any[]).find((t: any) => t.id === tarea.id)

    for (const assignee of [suelta.body().data.assignee, enLista.assignee]) {
      assert.notProperty(assignee, 'email')
      assert.notProperty(assignee, 'password')
      assert.notProperty(assignee, 'createdAt')
      assert.notProperty(assignee, 'updatedAt')
      assert.notInclude(JSON.stringify(assignee), 'ada@example.com')
    }
  })

  test('un responsable sin nombre llega con nombre nulo e iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe(null, 'ada@example.com')

    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}?today=2026-10-08`)
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    const enLista = (lista.body().data as any[]).find((t: any) => t.id === tarea.id)

    for (const assignee of [suelta.body().data.assignee, enLista.assignee]) {
      assert.isNull(assignee.fullName)
      assert.equal(assignee.initials, 'AE')
    }
  })
})
