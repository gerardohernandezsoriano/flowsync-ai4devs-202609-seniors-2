import Task from '#models/task'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, referenceDayValidator, updateTaskValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import { DateTime } from 'luxon'

/**
 * The caller's calendar day, from the `today` query parameter, or the
 * server's UTC day when it is not sent.
 */
async function resolveToday(request: HttpContext['request']) {
  const { today } = await request.validateUsing(referenceDayValidator, { data: request.qs() })

  return (today ?? DateTime.utc()).toISODate()!
}

export default class TasksController {
  async index({ request, serialize }: HttpContext) {
    const today = await resolveToday(request)
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks, today))
  }

  async show({ params, request, serialize }: HttpContext) {
    const today = await resolveToday(request)
    const task = await Task.query().where('id', params.id).preload('assignee').firstOrFail()

    return serialize(TaskTransformer.transform(task, today))
  }

  async store({ auth, request, serialize }: HttpContext) {
    const today = await resolveToday(request)
    const { title, dueDate } = await request.validateUsing(createTaskValidator, {
      // Body only: a query parameter must not count as a field. The body parser
      // already turns an empty or blank string into `null`, which clears the date.
      data: request.body(),
    })

    const task = await Task.create({
      title,
      status: 'pending',
      assigneeId: auth.getUserOrFail().id,
      dueDate: dueDate ?? null,
    })
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }

  async update({ params, request, serialize }: HttpContext) {
    const today = await resolveToday(request)
    const task = await Task.findOrFail(params.id)
    const payload = await request.validateUsing(updateTaskValidator, {
      // Body only: a query parameter must not count as a field. The body parser
      // already turns an empty or blank string into `null`, which clears the date.
      data: request.body(),
    })

    // A `null` due date counts as sent: it is how a date is cleared.
    if (
      payload.status === undefined &&
      payload.assigneeId === undefined &&
      payload.dueDate === undefined
    ) {
      throw new errors.E_VALIDATION_ERROR([
        { message: 'The status field must be defined', rule: 'required', field: 'status' },
      ])
    }

    // Only the fields that came in are touched.
    if (payload.status !== undefined) task.status = payload.status
    if (payload.assigneeId !== undefined) task.assigneeId = payload.assigneeId
    if (payload.dueDate !== undefined) task.dueDate = payload.dueDate
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task, today))
  }
}
