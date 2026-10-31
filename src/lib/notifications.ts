import { useEffect, useState } from 'react'
import { useTasks } from './storage'
import { taskDueDate } from './types'

const STORAGE_KEY = 'moy-den:notified-tasks'
/** Событие для показа напоминания внутри приложения. */
const EVENT = 'moy-den:reminder'

/**
 * Идентификаторы уже показанных напоминаний.
 * Ключ включает время дедлайна: если срок перенесли, напоминание сработает снова.
 */
function readNotified(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeNotified(ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return
  try {
    // Храним не больше 500 ids, чтобы localStorage не разрастался.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-500)))
  } catch {
    /* ignore */
  }
}

export type NotifyPermission = 'unsupported' | 'default' | 'granted' | 'denied'

export function notificationPermission(): NotifyPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission as NotifyPermission
}

/** Запрос разрешения. Вызывать только из обработчика жеста (клик/тап). */
export async function requestNotificationPermission(): Promise<NotifyPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  try {
    return (await Notification.requestPermission()) as NotifyPermission
  } catch {
    return notificationPermission()
  }
}

/** Хук со статусом разрешений (перерисовывается после запроса). */
export function useNotifications() {
  const [permission, setPermission] = useState<NotifyPermission>(() =>
    notificationPermission(),
  )

  async function request(): Promise<NotifyPermission> {
    const next = await requestNotificationPermission()
    setPermission(next)
    return next
  }

  return { permission, request }
}

/* ----------------------------- Внутренний баннер ------------------------- */

export interface Reminder {
  /** Ключ «задача@дедлайн» — по нему баннер закрывается и не дублируется. */
  key: string
  title: string
  body: string
  dueAt: number
  overdue: boolean
}

function emitReminder(reminder: Reminder): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<Reminder>(EVENT, { detail: reminder }))
}

/** Подписка на напоминания для UI (баннер внутри приложения). */
export function useReminders() {
  const [items, setItems] = useState<Reminder[]>([])

  useEffect(() => {
    const timers = new Map<string, number>()

    const handler = (event: Event) => {
      const reminder = (event as CustomEvent<Reminder>).detail
      if (!reminder) return
      setItems((prev) =>
        prev.some((item) => item.key === reminder.key)
          ? prev
          : [...prev, reminder],
      )
      const old = timers.get(reminder.key)
      if (old) window.clearTimeout(old)
      // Баннер висит 30 секунд, если его не закрыть.
      timers.set(
        reminder.key,
        window.setTimeout(() => {
          timers.delete(reminder.key)
          setItems((prev) => prev.filter((item) => item.key !== reminder.key))
        }, 30_000),
      )
    }

    window.addEventListener(EVENT, handler)
    return () => {
      window.removeEventListener(EVENT, handler)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const dismiss = (key: string) =>
    setItems((prev) => prev.filter((item) => item.key !== key))

  return { items, dismiss }
}

/* --------------------------- Системное уведомление ----------------------- */

/**
 * Показывает системное уведомление.
 * На Android/iOS конструктор `new Notification()` не работает — там нужен
 * Service Worker, поэтому сначала пробуем `registration.showNotification`.
 */
async function showSystem(reminder: Reminder): Promise<void> {
  if (notificationPermission() !== 'granted') return
  const options: NotificationOptions = {
    body: reminder.body
      ? `${reminder.title}\n${reminder.body}`
      : reminder.title,
    tag: reminder.key,
  }

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration?.showNotification) {
        await registration.showNotification('⏰ Мой день — напоминание', options)
        return
      }
    }
  } catch {
    /* пробуем обычный конструктор ниже */
  }

  try {
    new Notification('⏰ Мой день — напоминание', options)
  } catch {
    /* остаётся только баннер внутри приложения */
  }
}

/**
 * Тестовое напоминание из настроек: показывает, как всё будет выглядеть.
 * Возвращает false, если системные уведомления недоступны.
 */
export async function sendTestNotification(): Promise<boolean> {
  const reminder: Reminder = {
    key: `test@${Date.now()}`,
    title: 'Тестовое напоминание',
    body: 'Так выглядит уведомление о задаче в момент дедлайна.',
    dueAt: Date.now(),
    overdue: false,
  }
  emitReminder(reminder)
  if (notificationPermission() !== 'granted') return false
  await showSystem(reminder)
  return true
}

/**
 * Проверяет задачи с включённым напоминанием и срабатывает в момент дедлайна.
 * - Баннер внутри приложения показывается всегда, даже без разрешения
 *   на системные уведомления.
 * - Системное уведомление — только если разрешение выдано.
 * - Пропущенные сроки (до 24 часов назад) показываются при следующем
 *   открытии приложения: в закрытом состоянии браузер таймеры не крутит.
 */
export function useTaskReminderTicker(): void {
  const tasks = useTasks()
  const notifiedRef = useState(() => readNotified())[0]

  useEffect(() => {
    const notified = notifiedRef

    const check = () => {
      const now = Date.now()
      const alive = new Set<string>()

      for (const task of tasks) {
        if (!task.remind) continue
        const due = taskDueDate(task)
        if (!due) continue
        const dueAt = due.getTime()
        const key = `${task.id}@${dueAt}`
        // Отметку храним и для выполненных задач: снятие галочки не должно
        // вызывать повторное напоминание.
        alive.add(key)
        if (task.done) continue
        if (dueAt > now) continue
        // Пропущенные напоминания старше суток не показываем.
        if (now - dueAt > 86_400_000) continue
        if (notified.has(key)) continue

        notified.add(key)
        writeNotified(notified)
        const reminder: Reminder = {
          key,
          title: task.title,
          body: task.notes ?? '',
          dueAt,
          overdue: now - dueAt > 60_000,
        }
        emitReminder(reminder)
        void showSystem(reminder)
      }

      // Чистим отметки у выполненных/удалённых задач и перенесённых сроков.
      let changed = false
      for (const key of [...notified]) {
        if (!alive.has(key)) {
          notified.delete(key)
          changed = true
        }
      }
      if (changed) writeNotified(notified)
    }

    check()
    const timer = window.setInterval(check, 15_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [tasks, notifiedRef])
}

