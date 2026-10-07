const PREFIX = 'moy-den'

interface CacheEntry<T> {
  data: T
  savedAt: number
}

function readCache<T>(key: string): CacheEntry<T> | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(`${PREFIX}:${key}`)
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      `${PREFIX}:${key}`,
      JSON.stringify({ data, savedAt: Date.now() } satisfies CacheEntry<T>),
    )
  } catch {
    /* ignore */
  }
}

async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Запрос не удался (${res.status})`)
  return (await res.json()) as T
}

/* ------------------------------ Курсы валют ---------------------------- */

export interface CurrencyResult {
  from: string
  to: string
  rate: number
  updatedAt: number
}

const CURRENCY_CACHE = 'currency-cache'

export async function fetchCurrency(
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<CurrencyResult> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`
  try {
    const json = await getJSON<{
      result: string
      rates: Record<string, number>
      time_last_update_unix: number
    }>(url, signal)

    const rate = json.rates[to]
    if (json.result !== 'success' || typeof rate !== 'number') {
      throw new Error('Не удалось получить курс для выбранной пары валют')
    }

    const result: CurrencyResult = {
      from,
      to,
      rate,
      updatedAt: json.time_last_update_unix
        ? json.time_last_update_unix * 1000
        : Date.now(),
    }
    writeCache(CURRENCY_CACHE, result)
    return result
  } catch (error) {
    const cached = readCache<CurrencyResult>(CURRENCY_CACHE)
    if (cached && cached.data.from === from && cached.data.to === to) {
      return cached.data
    }
    throw error
  }
}

export function getCachedCurrency(): CurrencyResult | null {
  return readCache<CurrencyResult>(CURRENCY_CACHE)?.data ?? null
}

export const CURRENCIES = [
  'USD',
  'EUR',
  'RUB',
  'KZT',
  'GBP',
  'CNY',
  'JPY',
  'TRY',
  'UAH',
  'BYN',
] as const
