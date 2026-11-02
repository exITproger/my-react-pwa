import type { Settings } from './types'

/**
 * Внешний вид приложения: акцентный цвет, скругления, фон, размер текста.
 * Значения применяются как CSS-переменные на <html>, поэтому Tailwind-классы
 * (bg-brand-500, rounded-3xl и т.д.) автоматически подхватывают выбор.
 */

export interface AccentPreset {
  key: string
  label: string
  /** Базовый тон (HSL hue) и насыщенность для генерации шкалы. */
  hue: number
  sat: number
}

export const ACCENTS: AccentPreset[] = [
  { key: 'blue', label: 'Синий', hue: 220, sat: 55 },
  { key: 'pink', label: 'Розовый', hue: 335, sat: 60 },
  { key: 'violet', label: 'Фиолетовый', hue: 262, sat: 55 },
  { key: 'green', label: 'Зелёный', hue: 152, sat: 45 },
  { key: 'teal', label: 'Бирюзовый', hue: 180, sat: 45 },
  { key: 'amber', label: 'Янтарный', hue: 38, sat: 70 },
  { key: 'slate', label: 'Графитовый', hue: 215, sat: 15 },
]

const STEPS: Array<{ key: string; l: number }> = [
  { key: '50', l: 97 },
  { key: '100', l: 94 },
  { key: '200', l: 88 },
  { key: '300', l: 78 },
  { key: '400', l: 66 },
  { key: '500', l: 55 },
  { key: '600', l: 46 },
  { key: '700', l: 38 },
  { key: '800', l: 30 },
]

function hslToHex(h: number, s: number, l: number): string {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Шкала оттенков 50–800 из тона и насыщенности. */
function scaleFrom(hue: number, sat: number): Record<string, string> {
  const scale: Record<string, string> = {}
  STEPS.forEach(({ key, l }) => {
    scale[key] = hslToHex(hue, sat, l)
  })
  return scale
}

/** hex → [hue, saturation] для пользовательского цвета. */
function hexToHueSat(hex: string): { hue: number; sat: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { hue: 220, sat: 8 }
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === r) h = 60 * (((g - b) / d) % 6)
  else if (max === g) h = 60 * ((b - r) / d + 2)
  else h = 60 * ((r - g) / d + 4)
  return { hue: (h + 360) % 360, sat: Math.min(85, Math.max(20, s * 100)) }
}

const RADIUS_MODES: Record<
  Settings['radius'],
  Record<string, string> | null
> = {
  soft: null, // значения по умолчанию из @theme
  round: {
    '--radius-xl': '0.875rem',
    '--radius-2xl': '1.25rem',
    '--radius-3xl': '1.75rem',
  },
  sharp: {
    '--radius-xl': '0.5rem',
    '--radius-2xl': '0.75rem',
    '--radius-3xl': '1rem',
  },
}

const FONT_SCALES: Record<Settings['fontScale'], string> = {
  small: '15px',
  default: '',
  large: '17.5px',
}

/** Применяет настройки внешнего вида к <html>. */
export function applyAppearance(settings: Settings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const style = root.style

  // Акцентный цвет
  let hue: number
  let sat: number
  if (settings.accent === 'custom' && settings.customAccent) {
    const parsed = hexToHueSat(settings.customAccent)
    hue = parsed ? parsed.hue : 220
    sat = parsed ? parsed.sat : 55
  } else {
    const preset =
      ACCENTS.find((a) => a.key === settings.accent) ?? ACCENTS[0]
    hue = preset.hue
    sat = preset.sat
  }
  const scale = scaleFrom(hue, sat)
  Object.entries(scale).forEach(([k, v]) => {
    style.setProperty(`--color-brand-${k}`, v)
  })

  // Скругления
  const radii = RADIUS_MODES[settings.radius ?? 'soft']
  Object.keys(RADIUS_MODES.round ?? {}).forEach((k) => {
    if (radii) style.setProperty(k, radii[k])
    else style.removeProperty(k)
  })

  // Размер текста
  const font = FONT_SCALES[settings.fontScale ?? 'default']
  if (font) style.fontSize = font
  else style.removeProperty('font-size')

  // Фон: градиентные пятна или однотонный
  root.classList.toggle('bg-plain', settings.background === 'plain')

  // Пятна фона окрашиваются в тон акцента
  style.setProperty('--blob-1', `hsl(${hue} ${sat}% 60% / 0.18)`)
  style.setProperty('--blob-2', `hsl(${hue} ${sat}% 80% / 0.28)`)
  style.setProperty('--blob-3', `hsl(${hue} ${sat}% 90% / 0.4)`)
  style.setProperty('--blob-1-dark', `hsl(${hue} ${sat}% 55% / 0.16)`)
  style.setProperty('--blob-2-dark', `hsl(${hue} ${sat}% 45% / 0.1)`)
  style.setProperty('--blob-3-dark', `hsl(${hue} ${sat}% 35% / 0.12)`)
}
