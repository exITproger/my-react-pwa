import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatRelative } from './hooks'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 6, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatRelative', () => {
  it('форматирует интервалы по-русски', () => {
    expect(formatRelative(Date.now() - 10_000)).toBe('только что')
    expect(formatRelative(Date.now() - 5 * MINUTE)).toBe('5 мин назад')
    expect(formatRelative(Date.now() - 3 * HOUR)).toBe('3 ч назад')
    expect(formatRelative(Date.now() - DAY)).toBe('вчера')
    expect(formatRelative(Date.now() - 3 * DAY)).toBe('3 дн назад')
  })

  it('для старой даты показывает день и месяц', () => {
    expect(formatRelative(Date.now() - 30 * DAY)).toMatch(/\d{2} .*б?\./)
  })
})
