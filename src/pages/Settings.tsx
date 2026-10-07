import { useState } from 'react'
import {
  resetAllData,
  settingsStore,
  useHabits,
  useNotes,
  useSettings,
  useTasks,
} from '../lib/storage'
import { CURRENCIES } from '../lib/api'
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
  const [confirmReset, setConfirmReset] = useState(false)

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

  return (
    <div className="space-y-5">
      <PageHeader title="Настройки" subtitle="Внешний вид и данные" />

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
                  ? 'border-brand-500 bg-gradient-to-br from-brand-50 to-violet-50 text-brand-700 shadow-md dark:from-brand-500/15 dark:to-violet-500/15 dark:text-brand-100'
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
