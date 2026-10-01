import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import { useAuth } from '@/auth/use-auth'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FIELDS = ['title'] as const

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback

export function TasksPage() {
  const { token } = useAuth()
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)
  // `null` mientras llega la primera respuesta: no se puede distinguir una
  // lista vacía de una lista que aún no se ha cargado.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set())
  const [title, setTitle] = useState('')
  // `isSubmitting` solo cambia tras el siguiente render, así que un segundo
  // Intro inmediato se colaría. La referencia lo corta al instante.
  const submittingRef = useRef(false)

  // La lista se pide siempre entera y se pinta en el orden recibido: no hay
  // regla de orden decidida y la pantalla no inventa ninguna.
  const loadTasks = useCallback(async () => {
    if (!token) return
    try {
      setTasks(await api.listTasks(token))
      setLoadError(null)
    } catch (error) {
      setLoadError(errorMessage(error, 'No hemos podido cargar las tareas.'))
    }
  }, [token])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
  if (!token) return null

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault()
    if (submittingRef.current) return

    if (!title.trim()) {
      failWith('title', 'Escribe un título para la tarea.')
      return
    }

    submittingRef.current = true
    setActionError(null)
    return submit(async () => {
      try {
        await api.createTask(token, title)
        // La tarea ya existe: a partir de aquí un fallo es de la carga de la
        // lista y no de la creación, para que nadie la repita.
        setTitle('')
        await loadTasks()
      } finally {
        submittingRef.current = false
      }
    })
  }

  const handleStatusChange = async (task: Task, next: TaskStatus) => {
    if (pendingIds.has(task.id) || next === task.status) return

    const previous = task.status
    const setStatus = (id: number, status: TaskStatus) =>
      setTasks(
        (current) =>
          current?.map((item) =>
            item.id === id ? { ...item, status } : item,
          ) ?? current,
      )

    setActionError(null)
    setStatus(task.id, next)
    setPendingIds((current) => new Set(current).add(task.id))

    try {
      const updated = await api.updateTask(token, task.id, { status: next })
      setStatus(updated.id, updated.status)
    } catch (error) {
      setStatus(task.id, previous)
      setActionError(
        errorMessage(error, 'No hemos podido cambiar el estado de la tarea.'),
      )
    } finally {
      setPendingIds((current) => {
        const rest = new Set(current)
        rest.delete(task.id)
        return rest
      })
    }
  }

  const alertMessage = formError ?? actionError ?? loadError

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <Link
            to="/profile"
            className="text-foreground text-sm font-medium underline"
          >
            Mi perfil
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista del equipo</CardTitle>
            <CardDescription>
              La misma lista para todos: qué hay, quién lo lleva y en qué estado
              está.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6">
            <form onSubmit={handleCreate} className="grid gap-2" noValidate>
              <Label htmlFor="title">Nueva tarea</Label>
              <div className="flex gap-2">
                <Input
                  id="title"
                  name="title"
                  autoComplete="off"
                  placeholder="¿Qué hay que hacer?"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.title)}
                  aria-describedby={
                    fieldErrors.title ? 'title-error' : undefined
                  }
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creando…' : 'Crear tarea'}
                </Button>
              </div>
              <FieldError id="title-error" message={fieldErrors.title} />
            </form>

            {alertMessage && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{alertMessage}</AlertDescription>
              </Alert>
            )}

            {tasks === null && !loadError && (
              <div
                className="flex justify-center py-6"
                role="status"
                aria-live="polite"
              >
                <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
                <span className="sr-only">Cargando…</span>
              </div>
            )}

            {tasks?.length === 0 && (
              <p className="text-muted-foreground text-sm">
                Aquí vivirá la lista compartida del equipo: cada tarea con su
                responsable y su estado, a la vista de todos. Todavía no hay
                ninguna; crea la primera con el formulario de arriba.
              </p>
            )}

            {tasks && tasks.length > 0 && (
              <ul className="divide-y">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
                  >
                    <div className="min-w-0 flex-1 basis-48">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="font-medium break-words hover:underline"
                      >
                        {task.title}
                      </Link>
                      <p className="text-muted-foreground text-sm">
                        {task.assignee.fullName?.trim() || 'Sin nombre'}
                      </p>
                    </div>
                    <select
                      aria-label={`Estado de la tarea «${task.title}»`}
                      value={task.status}
                      disabled={pendingIds.has(task.id)}
                      onChange={(event) =>
                        void handleStatusChange(
                          task,
                          event.target.value as TaskStatus,
                        )
                      }
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
