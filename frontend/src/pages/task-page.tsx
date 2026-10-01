import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertCircleIcon, CalendarX2Icon, Loader2Icon } from 'lucide-react'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task } from '@/lib/types'
import { useAuth } from '@/auth/use-auth'
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

// Tiempo sin teclear antes de guardar: el navegador emite un cambio por cada
// dígito del año (0002, 0020, 0202, 2026) y no deben guardarse a medias.
const SAVE_DELAY_MS = 600

const EMPTY_MESSAGE = 'Escribe una fecha completa o usa «Quitar fecha».'
const RANGE_MESSAGE =
  'Esa fecha no es válida: usa un año de 4 cifras entre 1000 y 9999.'

/** `null` si la entrada es una fecha completa y razonable; si no, el motivo. */
function checkDate(value: string): string | null {
  // Un campo vacío es lo mismo si se ha borrado que si está a medias, y
  // `validity.badInput` no es fiable entre navegadores: nunca quita la fecha.
  if (value === '') return EMPTY_MESSAGE
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(value)
  if (!match) return RANGE_MESSAGE
  const year = Number(match[1])
  return year >= 1000 && year <= 9999 ? null : RANGE_MESSAGE
}

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

export function TaskPage() {
  const { id = '' } = useParams()
  const { token } = useAuth()
  const [task, setTask] = useState<Task | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [dateError, setDateError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Última fecha que el servidor confirmó ('' si no tiene).
  const committedRef = useRef('')
  // Solo cuenta la respuesta del último guardado: las tardías se descartan.
  const requestRef = useRef(0)
  // Si algo falla con el campo enfocado, volver a la fecha anterior se aplaza
  // hasta que se suelte para no pisar lo que la persona está tecleando.
  const revertOnBlurRef = useRef(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoadState('loading')

    api
      .getTask(token, id)
      .then((loaded) => {
        if (cancelled) return
        committedRef.current = loaded.dueDate ?? ''
        setTask(loaded)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadState(
          error instanceof ApiError && error.status === 404
            ? 'not-found'
            : 'error',
        )
      })

    return () => {
      cancelled = true
    }
  }, [token, id])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  // `ProtectedRoute` garantiza que aquí ya hay sesión resuelta.
  if (!token) return null

  const restoreCommitted = () => {
    if (inputRef.current) inputRef.current.value = committedRef.current
  }

  const revert = () => {
    if (document.activeElement === inputRef.current) {
      revertOnBlurRef.current = true
    } else {
      restoreCommitted()
    }
  }

  const save = async (dueDate: string | null) => {
    const request = ++requestRef.current
    setSaveError(null)

    try {
      const updated = await api.updateTask(token, id, { dueDate })
      if (request !== requestRef.current) return
      committedRef.current = updated.dueDate ?? ''
      // El veredicto de vencida es el que devuelve el servidor, no uno propio.
      setTask(updated)
    } catch (error) {
      if (request !== requestRef.current) return
      setSaveError(
        error instanceof ApiError
          ? error.message
          : 'No hemos podido guardar la fecha.',
      )
      revert()
    }
  }

  const commitTypedValue = () => {
    const value = inputRef.current?.value ?? ''
    const problem = checkDate(value)

    if (problem) {
      setDateError(problem)
      revert()
      return
    }
    if (value !== committedRef.current) void save(value)
  }

  const handleChange = () => {
    clearTimeout(timerRef.current)
    setDateError(null)
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined
      commitTypedValue()
    }, SAVE_DELAY_MS)
  }

  const handleBlur = () => {
    // Al soltar el campo no se espera más: se guarda (o se avisa) ya.
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
      commitTypedValue()
    }
    if (revertOnBlurRef.current) {
      revertOnBlurRef.current = false
      restoreCommitted()
    }
  }

  const handleClear = () => {
    clearTimeout(timerRef.current)
    timerRef.current = undefined
    setDateError(null)
    revertOnBlurRef.current = false
    if (inputRef.current) inputRef.current.value = ''
    void save(null)
  }

  const back = (
    <Link to="/tasks" className="text-foreground text-sm font-medium underline">
      Volver a las tareas
    </Link>
  )

  return (
    <div className="bg-muted/40 flex min-h-svh justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">{back}</div>

        {loadState === 'loading' && (
          <div
            className="flex justify-center py-6"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
            <span className="sr-only">Cargando…</span>
          </div>
        )}

        {(loadState === 'not-found' || loadState === 'error') && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>
              {loadState === 'not-found'
                ? 'Esta tarea no existe.'
                : 'No hemos podido cargar la tarea. Inténtalo de nuevo en un momento.'}
            </AlertDescription>
          </Alert>
        )}

        {loadState === 'ready' && task && (
          <Card>
            <CardHeader>
              <CardTitle className="break-words">{task.title}</CardTitle>
              <CardDescription>
                Fecha de vencimiento (opcional).
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4">
              {task.isOverdue && (
                <p
                  role="status"
                  className="border-destructive text-destructive inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1 text-sm font-medium"
                >
                  <CalendarX2Icon className="size-4" aria-hidden="true" />
                  Vencida
                </p>
              )}

              {saveError && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Vence el</Label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={task.dueDate ?? ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={dateError ? 'dueDate-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClear}
                    disabled={task.dueDate === null}
                  >
                    Quitar fecha
                  </Button>
                </div>
                <FieldError
                  id="dueDate-error"
                  message={dateError ?? undefined}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
