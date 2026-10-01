import { TaskSchema } from '#database/schema'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * The only place that decides whether a task is overdue: it has a due date,
   * that date is before `today` and it is not done. Both sides are calendar
   * dates (`YYYY-MM-DD`) compared as text, so time zones cannot shift the day
   * and a task due today is not overdue yet. The verdict is never stored.
   */
  isOverdueOn(today: string) {
    const dueDate = this.dueDate?.toISODate()
    return dueDate !== null && dueDate !== undefined && this.status !== 'done' && dueDate < today
  }
}
