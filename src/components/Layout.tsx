import { NavLink, Outlet } from 'react-router-dom'
import { useOnlineStatus, useThemeEffect } from '../lib/hooks'
import { useReminders, useTaskReminderTicker } from '../lib/notifications'
import { useSettings } from '../lib/storage'
import { startAutoSync } from '../lib/sync'
import { useEffect, useRef } from 'react'
import { ClockIcon, CloseIcon, LogoIcon } from './icons'
import { DEFAULT_SETTINGS } from '../lib/types'

/** Пункты навигации; эмодзи берутся из настроек (navIcons). */
const NAV_BASE = [
  { to: '/', key: 'home', label: 'Обзор', end: true },
  { to: '/notes', key: 'notes', label: 'Заметки', end: false },
  { to: '/tasks', key: 'tasks', label: 'Задачи', end: false },
  { to: '/habits', key: 'habits', label: 'Привычки', end: false },
  { to: '/settings', key: 'settings', label: 'Настройки', end: false },
] as const

function OnlineBadge() {
  const online = useOnlineStatus()
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        />
      </span>
      {online ? 'Онлайн' : 'Офлайн'}
    </span>
  )
}

/** Всплывающее напоминание внутри приложения (работает и без разрешений). */
function ReminderStack() {
  const { items, dismiss } = useReminders()
  if (items.length === 0) return null
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-24 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end">
      {items.map((item) => (
        <div
          key={item.key}
          role="alert"
          className="animate-slide-up pointer-events-auto w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50/95 px-4 py-3 shadow-xl backdrop-blur-xl dark:border-amber-400/30 dark:bg-amber-500/15"
        >
          <div className="flex items-start gap-3">
            <span className="text-lg leading-none">
              <ClockIcon size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-200">
                {item.overdue ? 'Пропущенное напоминание' : 'Напоминание'}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {item.title}
              </p>
              {item.body && (
                <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                  {item.body}
                </p>
              )}
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {new Date(item.dueAt).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.key)}
              aria-label="Закрыть напоминание"
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/40 transition-transform duration-300 hover:rotate-6 hover:scale-105">
        <LogoIcon size={24} />
      </span>
      <div>
        <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
          Мой день
        </p>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          личный помощник
        </p>
      </div>
    </div>
  )
}

export default function Layout() {
  useThemeEffect()
  useTaskReminderTicker()
  const settings = useSettings()
  const navIcons = settings.navIcons ?? DEFAULT_SETTINGS.navIcons
  const navItems = NAV_BASE.map((item) => ({
    ...item,
    icon: navIcons[item.key as keyof typeof navIcons] ?? '•',
  }))

  // Синхронизация запускается один раз при монтировании Layout.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current) return
    autoStarted.current = true
    return startAutoSync()
  }, [])

  return (
    <div className="flex min-h-screen w-full">
      <ReminderStack />
      {/* Сайдбар на десктопе */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/60 bg-white/50 px-4 py-6 backdrop-blur-2xl md:flex dark:border-white/10 dark:bg-slate-950/40">
        <div className="mb-8 px-1">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                    : 'text-slate-500 hover:translate-x-1 hover:bg-white/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                    <span
                    className={`text-lg leading-none transition-transform duration-300 group-hover:scale-110 ${
                      isActive ? 'drop-shadow' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-1 pt-6">
          <OnlineBadge />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Шапка на мобильном */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/60 bg-white/70 px-4 py-3 backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-slate-950/60">
          <Logo />
          <OnlineBadge />
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-28 md:px-8 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Нижняя навигация на мобильном */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/60 bg-white/80 backdrop-blur-2xl md:hidden dark:border-white/10 dark:bg-slate-950/80">
        <div className="flex items-stretch justify-around px-1 py-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'group relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all duration-300 active:scale-90',
                  isActive
                    ? 'text-brand-600 dark:text-brand-300'
                    : 'text-slate-400 dark:text-slate-500',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 h-1 w-8 rounded-full bg-gradient-to-r from-brand-400 to-brand-600" />
                  )}
                  <span
                    className={`text-xl leading-none transition-transform duration-300 ${
                      isActive ? '-translate-y-0.5 scale-110' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
