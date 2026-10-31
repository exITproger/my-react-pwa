import { useEffect, useState } from 'react'
import {
  resetAllData,
  settingsStore,
  useHabits,
  useNotes,
  useSettings,
  useTasks,
} from '../lib/storage'
import { CURRENCIES } from '../lib/api'
import {
  checkServerHealth,
  register,
  login,
  logout,
  useSync,
  type ServerStorage,
} from '../lib/sync'
import {
  sendTestNotification,
  useNotifications,
} from '../lib/notifications'
import type { ThemeMode } from '../lib/types'
import { Button, Card, PageHeader, Select } from '../components/ui'

const THEMES: Array<{ value: ThemeMode; label: string; icon: string }> = [
  { value: 'light', label: 'Светлая', icon: '☀️' },
  { value: 'dark', label: 'Тёмная', icon: '🌙' },
  { value: 'system', label: 'Системная', icon: '🖥️' },
]

export default function SettingsPage() {
  const settings = useSettings()
  const notes = useNotes()
  const tasks = useTasks()
  const habits = useHabits()
  const sync = useSync()
  const notifications = useNotifications()
  const [confirmReset, setConfirmReset] = useState(false)
  const [authForm, setAuthForm] = useState<'register' | 'login' | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [serverStorage, setServerStorage] = useState<ServerStorage>('unknown')

  useEffect(() => {
    let cancelled = false
    void checkServerHealth().then((storage) => {
      if (!cancelled) setServerStorage(storage)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function update(patch: Partial<typeof settings>) {
    settingsStore.update((prev) => ({ ...prev, ...patch }))
  }

  function doReset() {
    resetAllData()
    setConfirmReset(false)
  }

  const stats = [
    { icon: '📝', label: 'Заметок', value: notes.length },
    { icon: '✅', label: 'Задач', value: tasks.length },
    { icon: '🔥', label: 'Привычек', value: habits.length },
  ]

  const handleAuth = async () => {
    setAuthError(null)
    if (!authForm) return
    try {
      if (authForm === 'register') {
        await register(username.trim(), password)
      } else {
        await login(username.trim(), password)
      }
      setAuthForm(null)
      setUsername('')
      setPassword('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Настройки" subtitle="Внешний вид, данные, синхронизация" />

      {/* Тема */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          🎨 Тема оформления
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ theme: t.value })}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-xs font-bold transition-all duration-300 active:scale-95 ${
                settings.theme === t.value
                  ? 'border-brand-500 bg-linear-to-br from-brand-50 to-violet-50 text-brand-700 shadow-md dark:from-brand-500/15 dark:to-violet-500/15 dark:text-brand-100'
                  : 'border-white/60 bg-white/60 text-slate-600 hover:border-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Валюты */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          💱 Валютная пара
        </h3>
        <div className="flex items-center gap-3">
          <Select
            value={settings.currencyFrom}
            onChange={(e) => update({ currencyFrom: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <span className="font-bold text-slate-400">→</span>
          <Select
            value={settings.currencyTo}
            onChange={(e) => update({ currencyTo: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Курс подгружается онлайн и кэшируется для офлайн-просмотра.
        </p>
      </Card>

      {/* Синхронизация */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          🔄 Синхронизация
        </h3>
        {serverStorage === 'memory' && (
          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            ⚠️ Сервер работает без постоянного хранилища: аккаунты живут только
            в памяти одного инстанса. Поэтому вход со второго устройства может
            отвечать «Неверный логин или пароль». Включите Vercel KV / Upstash
            Redis и задайте переменные <code>KV_REST_API_URL</code> и{' '}
            <code>KV_REST_API_TOKEN</code>.
          </div>
        )}
        <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Зарегистрируйте аккаунт для синхронизации между устройствами.
          Данные хранятся на сервере и обновляются каждые 30 секунд, а также
          при открытии приложения или выходе из спящего режима.
        </p>

        {sync.enabled ? (
          <div className="space-y-3">
            {sync.status === 'error' && sync.lastError ? (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <span>⚠️</span>
                <div>
                  <p className="font-semibold">Не удалось синхронизировать</p>
                  <p className="text-xs">{sync.lastError}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                {sync.status === 'syncing' ? 'Синхронизация…' : 'Синхронизировано'}
                {sync.lastSyncAt && (
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                    {new Date(sync.lastSyncAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              Выйти из аккаунта
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sync.lastError && !authError && (
              <p className="text-xs text-rose-500 dark:text-rose-300">
                {sync.lastError}
              </p>
            )}
            {authForm ? (
              <>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Логин"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full rounded-2xl border border-black/5 bg-white/80 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:focus:bg-slate-900/60 dark:focus:ring-brand-500/20"
                  />
                  <input
                    type="password"
                    placeholder="Пароль"
                    autoComplete={
                      authForm === 'register' ? 'new-password' : 'current-password'
                    }
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full rounded-2xl border border-black/5 bg-white/80 px-4 py-2.5 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100 dark:focus:bg-slate-900/60 dark:focus:ring-brand-500/20"
                  />
                </div>
                {authError && (
                  <p className="text-xs text-rose-500 dark:text-rose-300">
                    {authError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleAuth}>
                    {authForm === 'register' ? 'Зарегистрироваться' : 'Войти'}
                  </Button>
                  <Button variant="ghost" onClick={() => setAuthForm(null)}>
                    Отмена
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setAuthForm('login')}>
                  Войти
                </Button>
                <Button variant="soft" onClick={() => setAuthForm('register')}>
                  Зарегистрироваться
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Напоминания */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          🔔 Напоминания
        </h3>
        <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Напоминание о задаче показывается в момент дедлайна: всплывающей
          карточкой внутри приложения и системным уведомлением, если браузер
          его разрешил. Пока приложение закрыто, браузер напоминания не
          присылает — пропущенное за последние сутки появится при следующем
          открытии.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              notifications.permission === 'granted'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : notifications.permission === 'denied'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
            }`}
          >
            {notifications.permission === 'granted' && 'Уведомления разрешены'}
            {notifications.permission === 'denied' && 'Уведомления заблокированы'}
            {notifications.permission === 'default' && 'Разрешение не выдано'}
            {notifications.permission === 'unsupported' &&
              'Браузер не поддерживает системные уведомления'}
          </span>
          {notifications.permission === 'default' && (
            <Button size="sm" onClick={() => void notifications.request()}>
              Разрешить
            </Button>
          )}
          {notifications.permission === 'granted' && (
            <Button
              size="sm"
              variant="soft"
              onClick={() => void sendTestNotification()}
            >
              Проверить
            </Button>
          )}
        </div>
      </Card>

      {/* Данные */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">
          📊 Ваши данные
        </h3>
        <div className="mb-4 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-lg">{s.icon}</p>
              <p className="mt-1 text-xl font-extrabold text-slate-800 dark:text-slate-100">
                {s.value}
              </p>
              <p className="text-[11px] text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <Button variant="danger" onClick={doReset}>
              Да, удалить всё
            </Button>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Отмена
            </Button>
          </div>
        ) : (
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            🗑️ Сбросить все данные
          </Button>
        )}
      </Card>

      {/* О приложении */}
      <Card className="animate-slide-up">
        <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">
          ℹ️ О приложении
        </h3>
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          «Мой день» — офлайн-помощник с онлайн-функциями. Заметки, задачи и
          привычки хранятся только на вашем устройстве (localStorage) и
          доступны без интернета. Курсы валют подгружаются из открытого
          источника и кэшируются. Приложение можно установить: меню браузера →
          «Установить приложение».
        </p>
      </Card>
    </div>
  )
}
