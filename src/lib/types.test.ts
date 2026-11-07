import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dueStatus, habitStreak } from './types'

// Фиксируем «сегодня» на 6 ноября 2026, чтобы даты не зависели от дня запуска тестов.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 6, 12, 0, 0))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('habitStreak', () => {
  it('считает подряд идущие дни, включая сегодня', () => {
    expect(habitStreak(['2026-11-06', '2026-11-05', '2026-11-04'])).toBe(3)
  })

  it('обрывает серию на пропущенном дне', () => {
    expect(habitStreak(['2026-11-06', '2026-11-05', '2026-11-03'])).toBe(2)
  })

  it('начинает со вчерашнего дня, если сегодня ещё не отмечено', () => {
    expect(habitStreak(['2026-11-05', '2026-11-04'])).toBe(2)
    expect(habitStreak([])).toBe(0)
  })
})

describe('dueStatus', () => {
  it('различает просрочено, сегодня, завтра и потом', () => {
    expect(dueStatus('2026-11-05')).toBe('overdue')
    expect(dueStatus('2026-11-06')).toBe('today')
    expect(dueStatus('2026-11-07')).toBe('tomorrow')
    expect(dueStatus('2026-11-10')).toBe('soon')
    expect(dueStatus('2026-12-01')).toBe('later')
  })

  it('возвращает none для задачи без срока', () => {
    expect(dueStatus(undefined)).toBe('none')
  })
})
