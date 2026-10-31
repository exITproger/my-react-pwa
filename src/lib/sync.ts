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
/** Состояние постоянного канала с сервером. */
export type ConnectionStatus = 'off' | 'connecting' | 'live' | 'polling'

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
  if (token) {
    connectStream()
    startPolling()
  } else {
    closeStream()
    setConnection('off')
  }
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

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    credentials: 'same-origin',
    ...init,
  })
  const text = await res.text()
  let body: Record<string, unknown> = {}
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>
    } catch {
      // Прокси/хостинг может вернуть HTML вместо JSON.
      if (!res.ok) {
        throw new ApiError(`Сервер вернул ошибку ${res.status}`, res.status)
      }
    }
  }
  if (!res.ok) {
    const message =
      typeof body.error === 'string' ? body.error : `Ошибка ${res.status}`
    throw new ApiError(message, res.status)
  }
  return body as T
}

/** Токен больше не действителен — выходим из аккаунта. */
function dropSession(reason: string): void {
  setToken(null)
  setStatus('off', reason)
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
  // После входа сначала забираем данные аккаунта с сервера.
  dirty = false
  pushedUpdatedAt = 0
  await syncNow()
}

export async function logout(): Promise<void> {
  const token = getToken()
  if (token) {
    try {
      await call('auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Сервер мог быть недоступен — локально всё равно выходим.
    }
  }
  applyingRemote = true
  try {
    setToken(null)
  } finally {
    applyingRemote = false
  }
  pushedUpdatedAt = 0
  dirty = false
  setStatus('off')
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
let connection: ConnectionStatus = getToken() ? 'connecting' : 'off'
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

function setConnection(next: ConnectionStatus): void {
  if (connection === next) return
  connection = next
  emit()
}

export function syncState() {
  return {
    status,
    connection,
    lastSyncAt,
    lastError,
    enabled: !!getToken(),
  }
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
    if (error instanceof ApiError && error.status === 401) {
      dropSession('Сессия истекла — войдите заново')
      return
    }
    setStatus('error', error instanceof Error ? error.message : String(error))
  }
}

/** Полная синхронизация: берём сервер, если он новее наших данных, иначе отправляем свои. */
export async function syncNow(): Promise<void> {
  const token = getToken()
  if (!token) return
  setStatus('syncing')
  try {
    const body = await call<{ data: SyncPayload | null }>('sync', {
      headers: { Authorization: `Bearer ${token}` },
    })
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
    if (error instanceof ApiError && error.status === 401) {
      dropSession('Сессия истекла — войдите заново')
      return
    }
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
  }, 500)
}

/* --------------------- Постоянный канал (SSE) + поллинг ------------------ */

let stream: EventSource | null = null
/** Сколько раз канал обрывался почти сразу после открытия. */
let streamFailures = 0
/** До этого момента не пробуем SSE (хостинг может его не поддерживать). */
let streamDisabledUntil = 0
let openedAt = 0
let reconnectTimer: number | null = null

const POLL_LIVE_MS = 15_000
const POLL_FALLBACK_MS = 5_000

function closeStream(): void {
  if (stream) {
    stream.close()
    stream = null
  }
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function connectStream(): void {
  if (typeof window === 'undefined') return
  const token = getToken()
  if (!token) {
    closeStream()
    setConnection('off')
    return
  }
  // Старые браузеры без EventSource — остаётся автоматический опрос.
  if (typeof EventSource === 'undefined') {
    setConnection('polling')
    return
  }
  if (stream || Date.now() < streamDisabledUntil) return

  setConnection('connecting')
  const source = new EventSource(
    `/api/stream?token=${encodeURIComponent(token)}`,
  )
  stream = source
  openedAt = Date.now()

  source.addEventListener('ready', () => {
    streamFailures = 0
    setConnection('live')
    // Пока канал был закрыт, могли появиться изменения.
    void syncNow()
  })

  source.addEventListener('sync', () => {
    void syncNow()
  })

  source.onerror = () => {
    if (stream !== source) return
    setConnection('polling')
    // Соединение прожило меньше 10 секунд — похоже, хостинг режет стрим.
    if (Date.now() - openedAt < 10_000) streamFailures += 1
    if (streamFailures >= 3) {
      // Переключаемся на частый опрос и не мучаем сервер стримом.
      streamDisabledUntil = Date.now() + 5 * 60_000
      closeStream()
      startPolling()
      return
    }
    // EventSource переподключается сам, но подстрахуемся.
    if (source.readyState === EventSource.CLOSED) {
      closeStream()
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null
        connectStream()
      }, 3000)
    }
  }
}

function startPolling(): void {
  if (timer) window.clearInterval(timer)
  const fallback = Date.now() < streamDisabledUntil
  const interval = fallback ? POLL_FALLBACK_MS : POLL_LIVE_MS
  timer = window.setInterval(() => {
    // Пока канал закрыт, держим данные свежими опросом.
    void syncNow()
    // И через некоторое время пробуем постоянный канал снова.
    if (!stream && Date.now() >= streamDisabledUntil) {
      streamFailures = 0
      connectStream()
    }
  }, interval)
}

/** Применяет локальные изменения при закрытии/скрытии страницы. */
function flushBeforeUnload(): void {
  const token = getToken()
  if (!token || !dirty) return
  try {
    void fetch('/api/sync', {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(currentPayload()),
    })
    dirty = false
  } catch {
    /* браузер не дал отправить — данные останутся локально */
  }
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

  const onOnline = () => {
    void syncNow()
    connectStream()
    startPolling()
  }
  const onOffline = () => setConnection(getToken() ? 'polling' : 'off')
  const onVisible = () => {
    if (document.visibilityState !== 'visible') {
      flushBeforeUnload()
      return
    }
    void syncNow()
    connectStream()
    startPolling()
  }
  const onPageHide = () => flushBeforeUnload()

  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  window.addEventListener('pagehide', onPageHide)
  document.addEventListener('visibilitychange', onVisible)

  startPolling()
  if (getToken()) {
    connectStream()
    void syncNow()
  }

  return () => {
    unsubscribes.forEach((u) => u())
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
    window.removeEventListener('pagehide', onPageHide)
    document.removeEventListener('visibilitychange', onVisible)
    closeStream()
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
