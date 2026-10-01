import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * The assignee's name is all the list needs: no email, id or creation and
 * update timestamps are exposed. `today` is the caller's calendar day
 * (`YYYY-MM-DD`), the reference for the overdue verdict.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  constructor(
    resource: Task,
    protected today: string
  ) {
    super(resource)
  }

  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: { fullName: this.resource.assignee.fullName },
      dueDate: this.resource.dueDate?.toISODate() ?? null,
      isOverdue: this.resource.isOverdueOn(this.today),
    }
  }
}
