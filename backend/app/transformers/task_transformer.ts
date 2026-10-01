import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * The list only needs the assignee's name: no email, id or dates are exposed.
 */
export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'title', 'status']),
      assignee: { fullName: this.resource.assignee.fullName },
    }
  }
}
