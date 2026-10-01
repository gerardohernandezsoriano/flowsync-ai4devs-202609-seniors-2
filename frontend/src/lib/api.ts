import type {
  AuthResult,
  LoginPayload,
  SignupPayload,
  Task,
  TaskStatus,
  User,
} from '@/lib/types'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

/** Forma de cada error que devuelve el backend: `{ errors: [...] }`. */
type BackendError = {
  message: string
  rule?: string
  field?: string
  meta?: Record<string, unknown>
}

/**
 * Error de API con el mensaje ya traducido y listo para pintar, más los errores
 * desglosados por campo para colocarlos bajo su input correspondiente.
 */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    status: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

const FIELD_LABELS: Record<string, string> = {
  fullName: 'el nombre',
  email: 'el email',
  password: 'la contraseña',
  passwordConfirmation: 'la confirmación de la contraseña',
  title: 'el título',
  status: 'el estado',
  assigneeId: 'el responsable',
  dueDate: 'la fecha',
  today: 'el día de hoy',
}

const label = (field?: string) => FIELD_LABELS[field ?? ''] ?? 'el campo'

/**
 * Traduce un error de VineJS a una frase que el usuario pueda entender.
 * Cubre las reglas de los validadores de usuario y de tarea del backend.
 */
function translate(error: BackendError): string {
  const { rule, field, meta } = error

  if (field === 'title') {
    if (rule === 'maxLength') {
      return `El título es demasiado largo: admite hasta ${meta?.max} caracteres.`
    }
    // Vacío, en blanco, ausente o sin formato de texto: en todos los casos
    // lo que la persona tiene que hacer es escribir un título.
    return 'Escribe un título para la tarea.'
  }

  if (field === 'dueDate') return 'Esa fecha no es válida.'
  if (field === 'today') return 'No se ha podido leer el día de hoy.'

  if (rule === 'enum') return 'Ese estado no es válido.'

  switch (rule) {
    case 'database.unique':
      return field === 'email'
        ? 'Ese email ya está registrado. Inicia sesión en su lugar.'
        : `Ya existe un registro con ${label(field)}.`
    case 'sameAs':
      return 'Las contraseñas no coinciden.'
    case 'email':
      return 'Introduce una dirección de email válida.'
    case 'required':
      return `Falta rellenar ${label(field)}.`
    case 'minLength':
      return `${label(field)} debe tener al menos ${meta?.min} caracteres.`
    case 'maxLength':
      return `${label(field)} no puede superar los ${meta?.max} caracteres.`
    default:
      return `Revisa ${label(field)}.`
  }
}

/**
 * Convierte una respuesta de error del backend en un `ApiError`.
 */
function toApiError(status: number, body: unknown): ApiError {
  const errors = (body as { errors?: BackendError[] } | null)?.errors

  if (status === 401) {
    return new ApiError(
      'Tu sesión ha caducado. Vuelve a iniciar sesión.',
      status,
    )
  }

  if (status === 404) {
    return new ApiError('Esa tarea ya no existe. Recarga la lista.', status)
  }

  // `User.verifyCredentials` lanza E_INVALID_CREDENTIALS con un 400 sin `field`.
  if (status === 400) {
    return new ApiError('El email o la contraseña no son correctos.', status)
  }

  if (status === 422 && errors?.length) {
    const fieldErrors: Record<string, string> = {}
    for (const error of errors) {
      if (error.field && !fieldErrors[error.field]) {
        fieldErrors[error.field] = translate(error)
      }
    }

    return new ApiError(translate(errors[0]), status, fieldErrors)
  }

  return new ApiError(
    'Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.',
    status,
  )
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  token?: string | null
}

async function request<T>(
  path: string,
  { method = 'GET', body, token }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Comprueba que el backend está arrancado.',
      0,
    )
  }

  // Un 500 puede responder HTML, así que el parseo no puede darse por hecho.
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw toApiError(response.status, payload)
  }

  return payload as T
}

export function signup(payload: SignupPayload): Promise<AuthResult> {
  return request<{ data: AuthResult }>('/api/v1/auth/signup', {
    method: 'POST',
    body: payload,
  }).then((response) => response.data)
}

export function login(payload: LoginPayload): Promise<AuthResult> {
  return request<{ data: AuthResult }>('/api/v1/auth/login', {
    method: 'POST',
    body: payload,
  }).then((response) => response.data)
}

export function getProfile(token: string): Promise<User> {
  return request<{ data: User }>('/api/v1/account/profile', { token }).then(
    (response) => response.data,
  )
}

export function logout(token: string): Promise<void> {
  return request('/api/v1/account/logout', { method: 'POST', token }).then(
    () => undefined,
  )
}

/**
 * El día de calendario de quien mira (`YYYY-MM-DD`). Se arma con los
 * componentes de la fecha local y no con `toISOString()`, que da el día UTC y
 * contaría como "mañana" o "ayer" a quien esté en otro huso.
 */
export function localDay(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Toda llamada de tareas manda el día de la persona: el veredicto de vencida es suyo. */
const withToday = (path: string) => `${path}?today=${localDay()}`

export function listTasks(token: string): Promise<Task[]> {
  return request<{ data: Task[] }>(withToday('/api/v1/tasks'), { token }).then(
    (response) => response.data,
  )
}

export function getTask(token: string, id: number | string): Promise<Task> {
  return request<{ data: Task }>(withToday(`/api/v1/tasks/${id}`), {
    token,
  }).then((response) => response.data)
}

export function createTask(token: string, title: string): Promise<Task> {
  return request<{ data: Task }>(withToday('/api/v1/tasks'), {
    method: 'POST',
    body: { title },
    token,
  }).then((response) => response.data)
}

/** `dueDate: null` quita la fecha; si la clave no viaja, la fecha no se toca. */
export function updateTask(
  token: string,
  id: number | string,
  changes: { status?: TaskStatus; dueDate?: string | null },
): Promise<Task> {
  return request<{ data: Task }>(withToday(`/api/v1/tasks/${id}`), {
    method: 'PATCH',
    body: changes,
    token,
  }).then((response) => response.data)
}
