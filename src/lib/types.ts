export interface Note {
  id: string
  title: string
  body: string
  /** Цветовой акцент карточки */
  color: NoteColor
  tags: string[]
  pinned: boolean
  createdAt: number
  updatedAt: number
}

export type NoteColor = 'default' | 'amber' | 'green' | 'blue' | 'pink' | 'violet'

export type TaskPriority = 'low' | 'medium' | 'high'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  done: boolean
  priority: TaskPriority
  /** Срок в формате YYYY-MM-DD */
  dueDate?: string
  tags: string[]
  subtasks: Subtask[]
  createdAt: number
  completedAt?: number
}

export type ThemeMode = 'light' | 'dark' | 'system'

export interface Habit {
  id: string
  name: string
  icon: string
  /** Даты выполнения в формате YYYY-MM-DD */
  history: string[]
  createdAt: number
}

export interface Settings {
  theme: ThemeMode
  currencyFrom: string
  currencyTo: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  currencyFrom: 'USD',
  currencyTo: 'RUB',
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const NOTE_COLORS: Record<NoteColor, string> = {
  default: 'bg-white/70 dark:bg-white/5',
  amber: 'bg-amber-100/70 dark:bg-amber-500/10',
  green: 'bg-emerald-100/70 dark:bg-emerald-500/10',
  blue: 'bg-sky-100/70 dark:bg-sky-500/10',
  pink: 'bg-pink-100/70 dark:bg-pink-500/10',
  violet: 'bg-violet-100/70 dark:bg-violet-500/10',
}

/** Плоские цветовые акценты для точек/бейджей. */
export const NOTE_DOTS: Record<NoteColor, string> = {
  default: 'bg-slate-400',
  amber: 'bg-amber-400',
  green: 'bg-emerald-400',
  blue: 'bg-sky-400',
  pink: 'bg-pink-400',
  violet: 'bg-violet-400',
}

/** Форматирует дату в YYYY-MM-DD (локальное время). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Возвращает массив из 7 дат (понедельник–воскресенье) для недели с `offset` недель. */
export function weekDates(offset = 0): Date[] {
  const now = new Date()
  const day = (now.getDay() + 6) % 7 // 0 = понедельник
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

/** Считает текущую серию (streak) подряд идущих выполненных дней. */
export function habitStreak(history: string[]): number {
  if (history.length === 0) return 0
  const set = new Set(history)
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  // Если сегодня ещё не отмечено — начинаем со вчера.
  if (!set.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (set.has(toDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Лучшая серия за всё время. */
export function habitBestStreak(history: string[]): number {
  if (history.length === 0) return 0
  const days = [...history].sort()
  let best = 1
  let current = 1
  for (let i = 1; i < days.length; i += 1) {
    const prev = new Date(days[i - 1])
    const cur = new Date(days[i])
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      current += 1
      best = Math.max(best, current)
    } else if (diff > 1) {
      current = 1
    }
  }
  return best
}

export type DueStatus = 'none' | 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later'

/** Определяет статус срока для подсветки. */
export function dueStatus(dueDate?: string): DueStatus {
  if (!dueDate) return 'none'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff <= 7) return 'soon'
  return 'later'
}

/** Человекочитаемая подпись срока. */
export function dueLabel(dueDate?: string): string {
  const status = dueStatus(dueDate)
  if (status === 'none') return ''
  if (status === 'overdue') return 'Просрочено'
  if (status === 'today') return 'Сегодня'
  if (status === 'tomorrow') return 'Завтра'
  const due = new Date(dueDate as string)
  return due.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

/** Все уникальные теги из набора элементов. */
export function collectTags(items: Array<{ tags: string[] }>): string[] {
  const set = new Set<string>()
  items.forEach((item) => item.tags.forEach((t) => set.add(t)))
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
}
