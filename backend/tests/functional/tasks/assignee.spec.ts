import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: responsable identificable, la tarea que no
 * filtra datos de cuenta (suelta y dentro de la lista) y el responsable sin
 * nombre.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function sesion(client: any, fullName: string | null, email = 'ada@example.com') {
    const user = await User.create({ fullName, email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: response.body().data.token as string }
  }

  async function tarea(responsable: User) {
    return Task.create({
      title: 'Escribir el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace')
    const task = await tarea(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-10-06' })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.equal(response.body().data.assignee.fullName, 'Ada Lovelace')
    assert.equal(response.body().data.assignee.initials, 'AL')
  })

  test('una tarea suelta no incluye el email ni otro dato de acceso', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace')
    const task = await tarea(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-10-06' })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const assignee = response.body().data.assignee
    assert.notProperty(assignee, 'email')
    assert.notProperty(assignee, 'password')
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')
  })

  test('una tarea dentro de la lista no incluye el email ni otro dato de acceso', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, 'Ada Lovelace')
    await tarea(user)

    const response = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)

    const assignee = response.body().data[0].assignee
    assert.notProperty(assignee, 'email')
    assert.notProperty(assignee, 'password')
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')
  })

  test('un responsable sin nombre llega con nombre nulo e iniciales', async ({
    client,
    assert,
  }) => {
    const { user, token } = await sesion(client, null)
    const task = await tarea(user)

    const response = await client
      .get(`/api/v1/tasks/${task.id}`)
      .qs({ today: '2026-10-06' })
      .header('Authorization', `Bearer ${token}`)

    response.assertStatus(200)

    const assignee = response.body().data.assignee
    assert.isNull(assignee.fullName)
    assert.equal(assignee.initials, 'AE')
    assert.notProperty(assignee, 'email')
  })
})
