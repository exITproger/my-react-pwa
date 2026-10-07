import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'

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
        'rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] backdrop-blur-xl',
        'dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.6)]',
        hover
          ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-16px_rgba(79,70,229,0.4)]'
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
      'bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:brightness-110 active:scale-95',
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
  icon,
  title,
  hint,
}: {
  icon: string
  title: string
  hint?: string
}) {
  return (
    <div className="animate-pop flex flex-col items-center rounded-3xl border border-dashed border-black/10 bg-white/40 px-6 py-14 text-center backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
      <span
        className="text-5xl"
        style={{ animation: 'float 3s ease-in-out infinite' }}
      >
        {icon}
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

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-500 via-violet-500 to-fuchsia-500 transition-all duration-700 ease-out"
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
