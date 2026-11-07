import { beforeEach, describe, expect, it } from 'vitest'
import { notesStore, resetAllData, settingsStore } from './storage'
import { DEFAULT_SETTINGS, type Note } from './types'

function note(id: string): Note {
  return {
    id,
    title: 'Тест',
    body: '',
    color: 'default',
    tags: [],
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
  }
}

beforeEach(() => {
  localStorage.clear()
  resetAllData()
})

describe('notesStore', () => {
  it('сохраняет значение в localStorage под своим ключом', () => {
    notesStore.set([note('1')])
    const raw = localStorage.getItem('moy-den:notes')
    expect(JSON.parse(raw as string)).toEqual([note('1')])
  })

  it('уведомляет подписчика один раз и перестаёт после отписки', () => {
    let calls = 0
    const unsubscribe = notesStore.subscribe(() => calls++)

    notesStore.set([note('1')])
    expect(calls).toBe(1)

    unsubscribe()
    notesStore.set([note('2')])
    expect(calls).toBe(1)
  })

  it('update получает предыдущее значение', () => {
    notesStore.set([note('1')])
    notesStore.update((prev) => [...prev, note('2')])
    expect(notesStore.get().map((n) => n.id)).toEqual(['1', '2'])
  })
})

describe('resetAllData', () => {
  it('чистит заметки и настройки', () => {
    settingsStore.update((prev) => ({ ...prev, theme: 'dark' }))
    notesStore.set([note('1')])

    resetAllData()

    expect(notesStore.get()).toEqual([])
    expect(localStorage.getItem('moy-den:notes')).toBe('[]')
    expect(settingsStore.get().theme).toBe(DEFAULT_SETTINGS.theme)
  })
})
