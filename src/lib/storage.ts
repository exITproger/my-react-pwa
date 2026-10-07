import { useSyncExternalStore } from 'react'
import {
  DEFAULT_SETTINGS,
  type Habit,
  type Note,
  type Settings,
  type Task,
} from './types'

const PREFIX = 'moy-den'

/**
 * Минимальный реактивный стор поверх localStorage.
 * Все компоненты, подписанные через useStore, синхронизируются между собой.
 */
function createStore<T>(key: string, initial: T) {
  const fullKey = `${PREFIX}:${key}`

  const read = (): T => {
    if (typeof localStorage === 'undefined') return initial
    try {
      const raw = localStorage.getItem(fullKey)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  }

  let value = read()
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  const store = {
    get: () => value,
    set(next: T) {
      value = next
      try {
        localStorage.setItem(fullKey, JSON.stringify(next))
      } catch {
        /* хранилище может быть недоступно — не критично */
      }
      emit()
    },
    update(fn: (prev: T) => T) {
      store.set(fn(value))
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reload() {
      value = read()
      emit()
    },
  }

  return store
}

export const notesStore = createStore<Note[]>('notes', [])
export const tasksStore = createStore<Task[]>('tasks', [])
export const habitsStore = createStore<Habit[]>('habits', [])
export const settingsStore = createStore<Settings>('settings', DEFAULT_SETTINGS)

function useStore<T>(store: {
  subscribe: (l: () => void) => () => void
  get: () => T
}): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

export function useNotes(): Note[] {
  return useStore(notesStore)
}

export function useTasks(): Task[] {
  return useStore(tasksStore)
}

export function useHabits(): Habit[] {
  return useStore(habitsStore)
}

export function useSettings(): Settings {
  return useStore(settingsStore)
}

/** Полный сброс пользовательских данных. */
export function resetAllData(): void {
  notesStore.set([])
  tasksStore.set([])
  habitsStore.set([])
  settingsStore.set(DEFAULT_SETTINGS)
}
