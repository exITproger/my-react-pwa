import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Пока открыто модальное окно — блокируем прокрутку фона (body).
 * Значение предыдущего overflow восстанавливается при закрытии.
 */
export function useLockBodyScroll(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [active])
}

export function Card({
  children,
  className = '',
  hover = false,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
}) {
  return (
    <div
      className={[
        'rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_30px_-12px_rgba(221,95,146,0.25)] backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]',
        hover
          ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(221,95,146,0.4)]'
          : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="animate-slide-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent dark:from-white dark:to-slate-400">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'soft'
  size?: 'sm' | 'md'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:brightness-110 active:scale-95',
    soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 active:scale-95 dark:bg-brand-500/15 dark:text-brand-100 dark:hover:bg-brand-500/25',
    ghost:
      'border border-black/10 text-slate-600 hover:bg-black/5 active:scale-95 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5',
    danger:
      'border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
  }
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-2xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    />
  )
}

export function IconButton({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition-all duration-200 hover:bg-black/5 hover:text-slate-800 active:scale-90 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white ${className}`}
    />
  )
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: (props: { size?: number; className?: string }) => ReactNode
  title: string
  hint?: string
}) {
  return (
    <div className="animate-pop flex flex-col items-center rounded-3xl border border-dashed border-black/10 bg-white/40 px-6 py-14 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
      <span
        className="text-brand-500"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      >
        <Icon size={44} />
      </span>
      <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
        {title}
      </p>
      {hint && (
        <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}

const fieldClass =
  'w-full rounded-2xl border border-black/5 bg-white/80 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:focus:bg-slate-900/60 dark:focus:ring-brand-500/20'

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${className}`} />
}

export function Textarea({
  className = '',
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${fieldClass} resize-y leading-relaxed ${className}`}
    />
  )
}

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${className}`} />
}

/** Один пункт кастомного дропдауна. */
export interface DropdownOption {
  value: string
  label: string
}

/**
 * Красивый выпадающий список вместо системного <select>:
 * анимированная панель, подсветка выбранного, закрытие по клику вне.
 *
 * Список рендерится через портал в document.body и позиционируется
 * фиксированно — поэтому его не обрезают родительские overflow-контейнеры
 * (модалки, скроллируемые карточки) ни на мобилке, ни на десктопе.
 */
export function Dropdown({
  value,
  options,
  onChange,
  className = '',
  placeholder = 'Выберите…',
}: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  // Пока открыт список — фон не скроллится
  useLockBodyScroll(open)

  // Компактный список (немного пунктов) центрируем посередине экрана,
  // чтобы на мобильном он не залезал ни на шапку, ни на нижнюю навигацию.
  const shouldCenter = options.length <= 7

  // Вычисляем позицию списка (fixed) относительно кнопки
  const updatePosition = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (shouldCenter) {
      // Ширина примерно как у кнопки, но не шире вьюпорта минус отступы
      const listWidth = Math.min(Math.max(rect.width, 200), vw - 32)
      // Оцениваем высоту панели и ставим её по центру экрана с гарантированными
      // отступами сверху/снизу — никуда не налезает даже на коротких экранах.
      const approxHeight = options.length * 44 + 24
      const maxAllowedHeight = Math.min(vh * 0.6, 360)
      const effectiveHeight = Math.min(approxHeight, maxAllowedHeight)
      const top = Math.max(16, (vh - effectiveHeight) / 2)
      const left = Math.max(
        8,
        Math.min(vw - listWidth - 8, rect.left + rect.width / 2 - listWidth / 2),
      )
      setPos({ top, left, width: listWidth })
      return
    }

    // Длинный список на маленьком экране — растягиваем на всю ширину
    const compactScreen = vw < 640
    const listWidth = compactScreen ? vw - 32 : Math.max(rect.width, 160)
    const left = compactScreen
      ? 16
      : Math.max(8, Math.min(vw - listWidth - 8, rect.left))
    // Ниже кнопки может не хватать места — прижимам к нижней границе вьюпорта
    const approxHeight = Math.min(options.length * 44 + 24, 256 + 16)
    let top = rect.bottom + 6
    if (top + approxHeight > vh - 8) top = Math.max(8, vh - approxHeight - 8)
    setPos({ top, left, width: listWidth })
  }, [shouldCenter, options.length])

  // Пересчитываем позицию при открытии и при скролле/ресайзе
  useEffect(() => {
    if (!open) return
    updatePosition()
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  // Прокрутка к активному элементу при открытии
  useEffect(() => {
    if (open && listRef.current) {
      const active = listRef.current.querySelector(
        '[aria-selected="true"]',
      ) as HTMLElement | null
      if (active) {
        active.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [open])

  // Закрытие по клику вне и по Esc
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      )
        return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const list =
    open && pos ? (
      // Оверлей на весь экран затемняет его целиком (в т.ч. низ, где на
      // мобильном может не хватать 100vh из-за адресной строки браузера)
      // и закрывает список по клику вне.
      <div
        className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-[2px]"
        style={{ height: '100dvh' }}
        onClick={() => setOpen(false)}
      >
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className={`animate-pop overflow-y-auto rounded-2xl border border-white/60 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 ${
            shouldCenter ? 'max-h-[70vh]' : 'max-h-64'
          }`}
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {opt.label}
                {active && (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    ) : null

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${fieldClass} flex cursor-pointer items-center justify-between gap-2 text-left`}
      >
        <span className={current ? '' : 'text-slate-400'}>
          {current ? current.label : placeholder}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Рендерим список через портал в body, чтобы его не обрезали overflow-контейнеры */}
      {typeof document !== 'undefined' && createPortal(list, document.body)}
    </div>
  )
}

export function Tag({
  children,
  onRemove,
  className = '',
}: {
  children: ReactNode
  onRemove?: () => void
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-100 ${className}`}
    >
      #{children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="grid h-3.5 w-3.5 place-items-center rounded-full transition hover:bg-brand-200/60 dark:hover:bg-brand-500/30"
        >
          ×
        </button>
      )}
    </span>
  )
}

const EMOJI_CHOICES = [
  '📝', '✅', '🔥', '⚡', '🏠', '⚙️', '📌', '💡',
  '🎯', '💪', '📚', '💰', '⭐', '☕', '🌈', '🧠',
  '❤️', '🎧', '🛒', '✈️', '🌱', '⏰', '📅', '🎨',
]

/** Кнопка с эмодзи, раскрывающая палитру для выбора. */
export function EmojiPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (emoji: string) => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  useLockBodyScroll(open)
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label ?? 'Выбрать значок'}
        title={label ?? 'Выбрать значок'}
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-white/80 text-lg transition-all hover:scale-105 hover:border-brand-300 active:scale-95 dark:border-white/10 dark:bg-white/5"
      >
        {value}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          style={{ height: '100dvh' }}
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-label={label ?? 'Выбор значка'}
            className="animate-pop w-full max-w-xs rounded-3xl border border-white/60 bg-white/95 p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
              {label ?? 'Выбор значка'}
            </p>
            <div className="grid grid-cols-6 gap-1.5">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onChange(emoji)
                    setOpen(false)
                  }}
                  className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition hover:bg-black/5 dark:hover:bg-white/10 ${
                    emoji === value ? 'bg-brand-100 dark:bg-brand-500/25' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

/** Круговой индикатор прогресса. */
export function Ring({
  value,
  size = 56,
  stroke = 6,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, value) / 100) * circumference
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-black/5 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-brand-500 transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}