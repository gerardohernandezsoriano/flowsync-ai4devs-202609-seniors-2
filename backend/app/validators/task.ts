import vine from '@vinejs/vine'

/**
 * Validator to use when creating a task: the title is the only input.
 * Any other field is dropped, so status and assignee cannot be chosen here.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
})

/**
 * Validator to use when updating a task. At least one of the two fields is
 * required; the title is not editable and is dropped if sent.
 */
export const updateTaskValidator = vine.create({
  status: vine
    .enum(['pending', 'in_progress', 'done'] as const)
    .optional()
    .requiredIfMissing('assigneeId'),
  assigneeId: vine
    .number()
    .positive()
    .withoutDecimals()
    .exists({ table: 'users', column: 'id' })
    .optional()
    .requiredIfMissing('status'),
})
