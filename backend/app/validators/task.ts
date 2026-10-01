import vine from '@vinejs/vine'

/**
 * Calendar dates travel as `YYYY-MM-DD`, with no time. Past dates are fine,
 * and `null` is how a date is cleared (absent means "leave it as it is").
 */
const dueDate = () =>
  vine
    .date({ formats: ['YYYY-MM-DD'] })
    .nullable()
    .optional()

/**
 * Validator to use when creating a task: the title is the only required input.
 * Any other field is dropped, so status and assignee cannot be chosen here.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  dueDate: dueDate(),
})

/**
 * Validator to use when updating a task. All fields are optional here: the
 * controller rejects a body with none of them. The title is not editable and
 * is dropped if sent, and so is `isOverdue`.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(['pending', 'in_progress', 'done'] as const).optional(),
  assigneeId: vine
    .number()
    .positive()
    .withoutDecimals()
    .exists({ table: 'users', column: 'id' })
    .optional(),
  dueDate: dueDate(),
})

/**
 * Validator for the `today` query parameter: the caller's calendar day, which
 * is the reference for the overdue verdict.
 */
export const referenceDayValidator = vine.create({
  today: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
})
