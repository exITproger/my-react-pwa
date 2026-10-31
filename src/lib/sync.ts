/**
 * Клиент синхронизации с сервером (папка `server/`).
 *
 * Всё устроено так, чтобы приложение оставалось полностью рабочим офлайн:
 * localStorage — основной источник данных, сервер — зеркало для второго
 * устройства. Если сервер недоступен или аккаунт не создан, ошибки молча
 * игнорируются.
 */
import { useEffect, useRef, useState } from 'react'
import {
  habitsStore,
  notesStore,
  settingsStore,
  tasksStore,
} from './storage'
import type { Habit, Note, Settings, Task } from './types'

const TOKEN_KEY = 'moy-den:sync-token'

/** true, пока данные применяются из ответа сервера (чтобы не отправлять их обратно). */
let applyingRemote = false

export interface SyncPayload {
  notes: Note[]
  tasks: Task[]
  habits: Habit[]
  settings: Settings
  updatedAt: number
}

export type SyncStatus = 'off' | 'syncing' | 'ok' | 'error'

/* ------------------------------ Токен доступа ---------------------------- */

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (typeof localStorage === 'undefined') return
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  emit()
}

/* --------------------------------- Хранилище ----------------------------- */

function currentPayload(): SyncPayload {
  return {
    notes: notesStore.get(),
    tasks: tasksStore.get(),
    habits: habitsStore.get(),
    settings: settingsStore.get(),
    updatedAt: Date.now(),
  }
}

function applyRemote(data: SyncPayload): void {
  applyingRemote = true
  try {
    notesStore.set(data.notes ?? [])
    tasksStore.set(data.tasks ?? [])
    habitsStore.set(data.habits ?? [])
    settingsStore.set({ ...settingsStore.get(), ...(data.settings ?? {}) })
  } finally {
    applyingRemote = false
  }
}

/* --------------------------------- Запросы ------------------------------- */

async function call<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(`/api/${path}`, init)
  const text = await res.text()
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  if (!res.ok) {
    const message =
      typeof body.error === 'string' ? body.error : `Ошибка ${res.status}`
    throw new Error(message)
  }
  return body as T
}

export async function register(
  username: string,
  password: string,
): Promise<void> {
  const body = await call<{ token: string }>('auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  applyingRemote = true
  try {
    setToken(body.token)
  } finally {
    applyingRemote = false
  }
  await pushNow()
}

export async function login(
  username: string,
  password: string,
): Promise<void> {
  const body = await call<{ token: string }>('auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  applyingRemote = true
  try {
    setToken(body.token)
  } finally {
    applyingRemote = false
  }
  await syncNow()
}

export function logout(): void {
  applyingRemote = true
  try {
    setToken(null)
  } finally {
    applyingRemote = false
  }
}

async function push(): Promise<void> {
  const token = getToken()
  if (!token) return
  await call<{ ok: boolean }>('sync', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(currentPayload()),
  })
}

/* --------------------------- Состояние и автосинк ------------------------ */

let status: SyncStatus = getToken() ? 'ok' : 'off'
let lastSyncAt = 0
let lastError: string | null = null
let timer: number | null = null
/** Отметка updatedAt, отправленная на сервер (чтобы не тянуть своё же). */
let pushedUpdatedAt = 0
/** Локальные изменения появились, а на сервер они ещё не легли. */
let dirty = false

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function setStatus(next: SyncStatus, error: string | null = null): void {
  status = next
  lastError = error
  if (next === 'ok') lastSyncAt = Date.now()
  emit()
}

export function syncState() {
  return { status, lastSyncAt, lastError, enabled: !!getToken() }
}

/** Отправляем данные на сервер (с задержкой, чтобы не долбить его на каждое нажатие). */
export async function pushNow(): Promise<void> {
  if (!getToken()) return
  setStatus('syncing')
  try {
    const payload = currentPayload()
    await push()
    pushedUpdatedAt = payload.updatedAt
    dirty = false
    setStatus('ok')
  } catch (error) {
    setStatus('error', error instanceof Error ? error.message : String(error))
  }
}

/** Полная синхронизация: берём сервер, если он новее наших данных, иначе отправляем свои. */
export async function syncNow(): Promise<void> {
  if (!getToken()) return
  setStatus('syncing')
  try {
    const res = await fetch('/api/sync', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error(`Ошибка ${res.status}`)
    const body = (await res.json()) as { data: SyncPayload | null }
    const remote = body.data

    if (remote && (remote.updatedAt ?? 0) !== pushedUpdatedAt) {
      // На сервере легли изменения с другого устройства — забираем их.
      applyRemote(remote)
      pushedUpdatedAt = remote.updatedAt ?? 0
      dirty = false
    } else if (dirty || !remote) {
      const payload = currentPayload()
      await push()
      pushedUpdatedAt = payload.updatedAt
      dirty = false
    }
    setStatus('ok')
  } catch (error) {
    setStatus('error', error instanceof Error ? error.message : String(error))
  }
}

let pushTimer: number | null = null
function schedulePush(): void {
  if (!getToken()) return
  // Не реагируем на изменения, которые пришли с сервера.
  if (applyingRemote) return
  dirty = true
  if (pushTimer) window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    pushTimer = null
    void pushNow()
  }, 1500)
}

function startLoop(): void {
  if (timer || typeof window === 'undefined') return
  // Периодическая подтяжка данных с другого устройства.
  timer = window.setInterval(() => void syncNow(), 30_000)
}

/**
 * Подписывает сторы на отправку, а серверные изменения — на применение.
 * Вызывается один раз из Layout.
 */
export function startAutoSync(): () => void {
  const unsubscribes = [
    notesStore.subscribe(schedulePush),
    tasksStore.subscribe(schedulePush),
    habitsStore.subscribe(schedulePush),
    settingsStore.subscribe(schedulePush),
  ]

  const onOnline = () => void syncNow()
  const onVisible = () => {
    if (document.visibilityState === 'visible') void syncNow()
  }
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)

  startLoop()
  if (getToken()) void syncNow()

  return () => {
    unsubscribes.forEach((u) => u())
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    if (timer) window.clearInterval(timer)
    timer = null
    if (pushTimer) window.clearTimeout(pushTimer)
    pushTimer = null
  }
}

export function useSync() {
  const [state, setState] = useState(() => syncState())
  const ref = useRef(state)
  ref.current = state

  useEffect(() => {
    const listener = () => setState(syncState())
    listeners.add(listener)
    setState(syncState())
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return state
}
