import { NavLink, Outlet } from 'react-router-dom'
import { useOnlineStatus, useThemeEffect } from '../lib/hooks'

const navItems = [
  { to: '/', label: 'Обзор', icon: '🏠', end: true },
  { to: '/notes', label: 'Заметки', icon: '📝', end: false },
  { to: '/tasks', label: 'Задачи', icon: '✅', end: false },
  { to: '/habits', label: 'Привычки', icon: '🔥', end: false },
  { to: '/settings', label: 'Настройки', icon: '⚙️', end: false },
]

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

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-violet-500 to-fuchsia-500 text-xl shadow-lg shadow-brand-500/40 transition-transform duration-300 hover:rotate-6 hover:scale-105">
        🌤️
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

  return (
    <div className="flex min-h-screen w-full">
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
                    ? 'bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/30'
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
                    <span className="absolute top-0 h-1 w-8 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
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
