import { useState, type ReactNode } from 'react'
import {
  resetAllData,
  settingsStore,
  useHabits,
  useNotes,
  useSettings,
  useTasks,
} from '../lib/storage'
import { ACCENTS } from '../lib/appearance'
import { CURRENCIES } from '../lib/api'
import { register, login, logout, useSync } from '../lib/sync'
import {
  sendTestNotification,
  useNotifications,
} from '../lib/notifications'
import type { ThemeMode } from '../lib/types'
import { DEFAULT_SETTINGS } from '../lib/types'
import { Button, Card, Dropdown, EmojiPicker, PageHeader } from '../components/ui'
import {
  BellIcon,
  CheckCircleIcon,
  ChartIcon,
  CoinsIcon,
  FlameIcon,
  ImageIcon,
  InfoIcon,
  MonitorIcon,
  MoonIcon,
  NoteIcon,
  PaletteIcon,
  RefreshIcon,
  SunIcon,
  TrashIcon,
  WarnIcon,
} from '../components/icons'

const THEMES: Array<{
  value: ThemeMode
  label: string
  icon: (props: { size?: number }) => ReactNode
}> = [
  { value: 'light', label: 'Светлая', icon: SunIcon },
  { value: 'dark', label: 'Тёмная', icon: MoonIcon },
  { value: 'system', label: 'Системная', icon: MonitorIcon },
]

const RADII = [
  { value: 'soft' as const, label: 'Мягкие' },
  { value: 'round' as const, label: 'Круглые' },
  { value: 'sharp' as const, label: 'Строгие' },
]

const BACKGROUNDS = [
  { value: 'mesh' as const, label: 'Градиентный' },
  { value: 'plain' as const, label: 'Однотонный' },
]

const FONT_SCALES = [
  { value: 'small' as const, label: 'Меньше' },
  { value: 'default' as const, label: 'Обычный' },
  { value: 'large' as const, label: 'Крупнее' },
]

export default function SettingsPage() {
  const stored = useSettings()
  // Старые сохранённые настройки могут не содержать новых полей — дополняем дефолтами.
  const settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    tileIcons: { ...DEFAULT_SETTINGS.tileIcons, ...stored.tileIcons },
    navIcons: { ...DEFAULT_SETTINGS.navIcons, ...stored.navIcons },
  }
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

  function update(patch: Partial<typeof settings>) {
    settingsStore.update((prev) => ({ ...prev, ...patch }))
  }

  function doReset() {
    resetAllData()
    setConfirmReset(false)
  }

  const stats = [
    { icon: NoteIcon, label: 'Заметок', value: notes.length },
    { icon: CheckCircleIcon, label: 'Задач', value: tasks.length },
    { icon: FlameIcon, label: 'Привычек', value: habits.length },
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <PaletteIcon size={16} className="text-brand-500" /> Тема оформления
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => update({ theme: t.value })}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 text-xs font-bold transition-all duration-300 active:scale-95 ${
                settings.theme === t.value
                  ? 'border-brand-500 bg-linear-to-br from-brand-50 to-rose-50 text-brand-700 shadow-md dark:from-brand-500/15 dark:to-brand-500/5 dark:text-brand-100'
                  : 'border-white/60 bg-white/60 text-slate-600 hover:border-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Внешний вид */}
      <Card className="animate-slide-up">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <ImageIcon size={16} className="text-brand-500" /> Внешний вид
        </h3>

        {/* Акцентный цвет */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Акцентный цвет
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a.key}
              type="button"
              title={a.label}
              aria-label={a.label}
              onClick={() => update({ accent: a.key })}
              className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-110 ${
                settings.accent === a.key
                  ? 'border-brand-500 scale-110 shadow-md'
                  : 'border-black/10 dark:border-white/20'
              }`}
              style={{ background: `hsl(${a.hue} ${a.sat}% 55%)` }}
            />
          ))}
          <label
            className={`flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-transform hover:scale-105 ${
              settings.accent === 'custom'
                ? 'border-brand-500 text-brand-700 dark:text-brand-200'
                : 'border-black/10 text-slate-500 dark:border-white/20 dark:text-slate-300'
            }`}
          >
            Свой
            <input
              type="color"
              value={settings.customAccent ?? '#4f7cc9'}
              onChange={(e) =>
                update({
                  accent: 'custom',
                  customAccent: e.target.value,
                })
              }
              className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
            />
          </label>
        </div>

        {/* Скругления */}
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Скругления
        </p>
        <div className="grid grid-cols-3 gap-2">
          {RADII.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => update({ radius: r.value })}
              className={`rounded-2xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                settings.radius === r.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100'
                  : 'border-white/60 bg-white/60 text-slate-600 hover:border-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Фон */}
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Фон
        </p>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => update({ background: b.value })}
              className={`rounded-2xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                settings.background === b.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100'
                  : 'border-white/60 bg-white/60 text-slate-600 hover:border-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Размер текста */}
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Размер текста
        </p>
        <div className="grid grid-cols-3 gap-2">
          {FONT_SCALES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => update({ fontScale: f.value })}
              className={`rounded-2xl border px-3 py-2 text-xs font-bold transition-all active:scale-95 ${
                settings.fontScale === f.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100'
                  : 'border-white/60 bg-white/60 text-slate-600 hover:border-brand-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Значки навигации */}
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Значки меню
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['home', 'Обзор'],
              ['notes', 'Заметки'],
              ['tasks', 'Задачи'],
              ['habits', 'Привычки'],
              ['settings', 'Настройки'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <EmojiPicker
                value={settings.navIcons[key]}
                label={label}
                onChange={(emoji) =>
                  update({ navIcons: { ...settings.navIcons, [key]: emoji } })
                }
              />
              <span className="text-[10px] font-semibold text-slate-400">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Значки плиток на главной */}
        <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Значки плиток на главном экране
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['notes', 'Заметки'],
              ['tasks', 'Задачи'],
              ['habits', 'Привычки'],
              ['streak', 'Серия'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <EmojiPicker
                value={settings.tileIcons[key]}
                label={label}
                onChange={(emoji) =>
                  update({ tileIcons: { ...settings.tileIcons, [key]: emoji } })
                }
              />
              <span className="text-[10px] font-semibold text-slate-400">
                {label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Валюты */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <CoinsIcon size={16} className="text-brand-500" /> Валютная пара
        </h3>
        <div className="flex items-center gap-3">
          <Dropdown
            value={settings.currencyFrom}
            onChange={(v) => update({ currencyFrom: v })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            className="flex-1"
          />
          <span className="font-bold text-slate-400">→</span>
          <Dropdown
            value={settings.currencyTo}
            onChange={(v) => update({ currencyTo: v })}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            className="flex-1"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Курс подгружается онлайн и кэшируется для офлайн-просмотра.
        </p>
      </Card>

      {/* Синхронизация */}
      <Card className="animate-slide-up">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <RefreshIcon size={16} className="text-brand-500" /> Синхронизация
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Зарегистрируйте аккаунт для синхронизации между устройствами.
          Изменения уходят на сервер сразу после правки, а между устройствами
          держится постоянный канал связи — обновления приходят без перезагрузки.
        </p>

        {sync.enabled ? (
          <div className="space-y-3">
            {sync.status === 'error' && sync.lastError ? (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <WarnIcon size={18} />
                <div>
                  <p className="font-semibold">Не удалось синхронизировать</p>
                  <p className="text-xs">{sync.lastError}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
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
                <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      sync.connection === 'live'
                        ? 'bg-emerald-500'
                        : sync.connection === 'connecting'
                          ? 'bg-amber-400'
                          : 'bg-slate-400'
                    }`}
                  />
                  {sync.connection === 'live' && 'Постоянная связь с сервером'}
                  {sync.connection === 'connecting' && 'Подключаемся к серверу…'}
                  {sync.connection === 'polling' &&
                    'Связь восстанавливается — данные обновляются автоматически'}
                  {sync.connection === 'off' && 'Нет связи с сервером'}
                </p>
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <BellIcon size={16} className="text-brand-500" /> Напоминания
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
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <ChartIcon size={16} className="text-brand-500" /> Ваши данные
        </h3>
        <div className="mb-4 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3 text-center dark:border-white/10 dark:bg-white/5"
            >
              <p className="text-brand-500">
                <s.icon size={20} />
              </p>
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
            <TrashIcon size={16} /> Сбросить все данные
          </Button>
        )}
      </Card>

      {/* О приложении */}
      <Card className="animate-slide-up">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
          <InfoIcon size={16} className="text-brand-500" /> О приложении
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
