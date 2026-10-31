import { useEffect, useRef } from 'react'
import { useTasks } from './storage'
import { taskDueDate } from './types'

const STORAGE_KEY = 'moy-den:notified-tasks'

/** Идентификаторы задач, о которых уже уведомили. */
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

/** Статус разрешений уведомлений + функция запроса (нужен жест пользователя). */
export function useNotifications() {
  const permission = notificationPermission()

  async function request(): Promise<NotifyPermission> {
    if (!('Notification' in window)) return 'unsupported'
    return (await Notification.requestPermission()) as NotifyPermission
  }

  return { permission, request }
}

function show(taskId: string, title: string, body: string): void {
  try {
    const notification = new Notification('⏰ Мой день — напоминание', {
      body: body ? `${title}\n${body}` : title,
      tag: `task-${taskId}`,
      icon: '/icon-192.png',
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  } catch {
    /* на некоторых мобильных браузерах конструктор Notification недоступен */
  }
}

/**
 * Проверяет активные задачи с включённым напоминанием и присылает
 * браузерное уведомление в момент дедлайна.
 */
export function useTaskReminderTicker(): void {
  const tasks = useTasks()
  const notified = useRef<Set<string>>(readNotified())

  useEffect(() => {
    if (notificationPermission() !== 'granted') return

    let cancelled = false

    const check = () => {
      const now = Date.now()
      let changed = false

      for (const task of tasks) {
        if (task.done || !task.remind) continue
        const due = taskDueDate(task)
        if (!due) continue
        // Не уведомляем о задачах со сроком раньше 24 часов в прошлом.
        if (due.getTime() > now || now - due.getTime() > 86_400_000) continue
        if (notified.current.has(task.id)) continue
        show(task.id, task.title, task.notes ?? '')
        notified.current.add(task.id)
        changed = true
      }

      // Убираем отметки у задач, где напоминание выключили или удалили задачу.
      if (changed) {
        const alive = new Set(
          tasks.filter((t) => t.remind && !t.done).map((t) => t.id),
        )
        for (const id of [...notified.current]) {
          if (!alive.has(id)) notified.current.delete(id)
        }
        writeNotified(notified.current)
      }
    }

    check()
    const timer = window.setInterval(check, 20_000)
    const onFocus = () => !cancelled && check()
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [tasks])
}
