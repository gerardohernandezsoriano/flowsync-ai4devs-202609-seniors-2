import { TASK_STATUSES } from '#models/task'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'

/**
 * Esquemas del documento OpenAPI que se repiten entre operaciones.
 *
 * Cada clase se publica una sola vez en `components.schemas`, bajo su propio
 * nombre, y las respuestas la referencian con `$ref`. Por eso el nombre de la
 * clase ES el nombre público del esquema.
 *
 * Describen lo que el código hace hoy, no lo que debería hacer: si una forma
 * cambia en un transformer o en un validador, se cambia aquí también.
 */

/** `TaskAssigneeTransformer`: lo justo para identificar al responsable. */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Nulo si la cuenta se registró sin nombre',
  })
  declare fullName: string | null

  @ApiProperty({ type: 'string', example: 'AL' })
  declare initials: string
}

/** `TaskTransformer`: la tarea tal y como sale en la lista, sin vencimiento. */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', maxLength: 200 })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee
}

/** `TaskDetailTransformer`: la tarea suelta, con su fecha y su condición de vencida. */
export class TaskDetail extends Task {
  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'Día del calendario (AAAA-MM-DD), sin hora; nulo si la tarea no tiene fecha',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description: 'Resuelto contra el día de referencia `today` de la petición',
  })
  declare isOverdue: boolean
}

/** Envoltorio `{ data }` del serializer para una tarea. */
export class TaskResponse {
  @ApiProperty({ type: Task })
  declare data: Task
}

/** Envoltorio `{ data }` del serializer para la lista. */
export class TaskListResponse {
  @ApiProperty({ type: [Task] })
  declare data: Task[]
}

/** Envoltorio `{ data }` del serializer para una tarea suelta. */
export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  declare data: TaskDetail
}

/** Cuerpo de `createTaskValidator`. */
export class CreateTaskBody {
  @ApiProperty({
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Se recortan los espacios de los extremos antes de validar la longitud',
  })
  declare title: string
}

/** Cuerpo de `updateTaskStatusValidator`. */
export class UpdateTaskStatusBody {
  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string
}

/** Cuerpo de `setTaskDueDateValidator`. */
export class SetTaskDueDateBody {
  @ApiProperty({
    type: 'string',
    format: 'date',
    nullable: true,
    description: 'AAAA-MM-DD; `null` retira la fecha',
  })
  declare dueDate: string | null

  @ApiProperty({
    type: 'string',
    format: 'date',
    description: 'Día de referencia de quien hace la petición (AAAA-MM-DD)',
  })
  declare today: string
}

/** Un error de la lista `errors`: los de VineJS traen `rule` y `field`; el de auth, solo `message`. */
export class ApiErrorItem {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiPropertyOptional({ type: 'string' })
  declare rule: string

  @ApiPropertyOptional({ type: 'string' })
  declare field: string

  @ApiPropertyOptional({ type: 'object' })
  declare meta: Record<string, unknown>
}

/** Forma de los 401 y 422: `{ errors: [...] }`. */
export class ErrorResponse {
  @ApiProperty({ type: [ApiErrorItem] })
  declare errors: ApiErrorItem[]
}

/** Forma de los 404 de `findOrFail`. En desarrollo trae además la traza. */
export class NotFoundResponse {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string

  @ApiPropertyOptional({ type: 'string', example: 'E_ROW_NOT_FOUND' })
  declare code: string
}
