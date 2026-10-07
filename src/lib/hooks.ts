import { useEffect, useState } from 'react'
import { useSettings } from './storage'
import {
  fetchCurrency,
  getCachedCurrency,
  type CurrencyResult,
} from './api'

/** Применяет выбранную тему к <html> и следит за системной темой. */
export function useThemeEffect(): void {
  const { theme } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', isDark)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', isDark ? '#0b1020' : '#f8fafc')
    }

    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme])
}

/** Возвращает true, когда браузер онлайн. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}

/** Форматирует относительное время: «только что», «5 мин назад», «вчера». */
export function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  if (days < 7) return `${days} дн назад`
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  })
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function weekdayShort(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { weekday: 'short' })
}

/** Курс валют с онлайн-обновлением и мгновенным показом кэша. */
export function useCurrency(from: string, to: string) {
  const [data, setData] = useState<CurrencyResult | null>(() =>
    getCachedCurrency(),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetchCurrency(from, to, controller.signal)
      .then((result) => setData(result))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [from, to])

  return { data, loading, error }
}
