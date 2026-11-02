import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHabits, useNotes, settingsStore, useSettings, useTasks } from '../lib/storage'
import { CURRENCIES } from '../lib/api'
import { formatRelative, useCurrency } from '../lib/hooks'
import {
  DEFAULT_SETTINGS,
  dueLabelWithTime,
  habitStreak,
  toDateKey,
  type Habit,
  type Task,
} from '../lib/types'
import { Button, Card, Dropdown, ProgressBar, Ring, Tag } from '../components/ui'
import {
  CloseIcon,
  CoinsIcon,
  FlameIcon,
  NoteIcon,
  PinIcon,
} from '../components/icons'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

function StatTile({
  icon,
  value,
  label,
  gradient,
  to,
  delay,
}: {
  icon: string
  value: string
  label: string
  gradient: string
  to: string
  delay: number
}) {
  return (
    <Link
      to={to}
      style={{ animationDelay: `${delay}ms` }}
      className="animate-slide-up group relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-4 shadow-[0_8px_30px_-12px_rgba(221,95,146,0.25)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_40px_-16px_rgba(221,95,146,0.45)] dark:border-white/10 dark:bg-white/[0.06]"
    >
      <div
        className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-xl transition-all duration-500 group-hover:opacity-40 group-hover:scale-125`}
      />
      <span className="text-2xl">{icon}</span>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </Link>
  )
}

function priorityDot(priority: Task['priority']): string {
  return {
    low: 'bg-slate-400',
    medium: 'bg-amber-400',
    high: 'bg-rose-500',
  }[priority]
}

export default function Dashboard() {
  const notes = useNotes()
  const tasks = useTasks()
  const habits = useHabits()
  const settings = useSettings()
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [fromDraft, setFromDraft] = useState(settings.currencyFrom)
  const [toDraft, setToDraft] = useState(settings.currencyTo)
  const { data: currency } = useCurrency(
    settings.currencyFrom,
    settings.currencyTo,
  )

  function openCurrencyModal() {
    setFromDraft(settings.currencyFrom)
    setToDraft(settings.currencyTo)
    setCurrencyOpen(true)
  }

  function saveCurrency() {
    settingsStore.update((prev) => ({
      ...prev,
      currencyFrom: fromDraft,
      currencyTo: toDraft,
    }))
    setCurrencyOpen(false)
  }

  const today = toDateKey(new Date())
  const activeTasks = tasks.filter((t) => !t.done)
  const doneCount = tasks.length - activeTasks.length
  const progress = tasks.length ? (doneCount / tasks.length) * 100 : 0

  const todayTasks = activeTasks
    .filter((t) => t.dueDate && t.dueDate <= today)
    .slice(0, 5)

  const habitsDoneToday = habits.filter((h) =>
    h.history.includes(today),
  ).length

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)

  const maxStreak = habits.reduce(
    (max, h) => Math.max(max, habitStreak(h.history)),
    0,
  )

  return (
    <div className="space-y-6">
      {/* Приветствие */}
      <div className="animate-slide-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent dark:from-white dark:to-slate-400">
            {greeting()}!
          </h2>
          <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">
            {new Date().toLocaleDateString('ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {/* Статистика */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={settings.tileIcons?.notes ?? DEFAULT_SETTINGS.tileIcons.notes}
          value={String(notes.length)}
          label="заметок"
          gradient="from-sky-400 to-blue-500"
          to="/notes"
          delay={0}
        />
        <StatTile
          icon={settings.tileIcons?.tasks ?? DEFAULT_SETTINGS.tileIcons.tasks}
          value={String(activeTasks.length)}
          label="активных задач"
          gradient="from-emerald-400 to-teal-500"
          to="/tasks"
          delay={60}
        />
        <StatTile
          icon={settings.tileIcons?.habits ?? DEFAULT_SETTINGS.tileIcons.habits}
          value={String(habitsDoneToday)}
          label={`из ${habits.length} привычек`}
          gradient="from-orange-400 to-rose-500"
          to="/habits"
          delay={120}
        />
        <StatTile
          icon={settings.tileIcons?.streak ?? DEFAULT_SETTINGS.tileIcons.streak}
          value={String(maxStreak)}
          label="дней в серии"
          gradient="from-brand-400 to-brand-600"
          to="/habits"
          delay={180}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {/* Прогресс задач */}
        <Card className="animate-slide-up lg:col-span-1" hover>
          <div className="flex items-center gap-4">
            <Ring value={progress}>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {Math.round(progress)}%
              </span>
            </Ring>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Прогресс задач
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {doneCount} из {tasks.length} выполнено
              </p>
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={progress} />
          </div>
        </Card>

        {/* Курс валют */}
        <Card className="animate-slide-up lg:col-span-2" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Курс валют
              </p>
              {currency ? (
                <>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {currency.rate.toFixed(2)}{' '}
                    <span className="text-lg font-bold text-slate-400">
                      {currency.to}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    за 1 {currency.from} · обновлено{' '}
                    {formatRelative(currency.updatedAt)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-400">
                  Нет данных — проверьте соединение
                </p>
              )}
            </div>
            <span className="text-brand-500">
              <CoinsIcon size={32} />
            </span>
          </div>
          <button
            type="button"
            onClick={openCurrencyModal}
            className="mt-3 inline-block text-xs font-bold text-brand-600 transition hover:translate-x-1 dark:text-brand-300"
          >
            Изменить пару →
          </button>
        </Card>
      </section>

      {/* Модальное окно смены валютной пары */}
      {currencyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setCurrencyOpen(false)}
        >
          <div
            className="animate-slide-up w-full max-w-sm rounded-3xl border border-white/60 bg-white/95 p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Валютная пара
              </h3>
              <button
                type="button"
                onClick={() => setCurrencyOpen(false)}
                aria-label="Закрыть"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-black/5 dark:text-slate-400 dark:hover:bg-white/10"
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Dropdown
                value={fromDraft}
                onChange={setFromDraft}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                className="flex-1"
              />
              <span className="font-bold text-slate-400">→</span>
              <Dropdown
                value={toDraft}
                onChange={setToDraft}
                options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                className="flex-1"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCurrencyOpen(false)}>
                Отмена
              </Button>
              <Button onClick={saveCurrency}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}

      {/* На сегодня */}
      <section className="animate-slide-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <PinIcon size={16} className="text-brand-500" /> На сегодня
          </h3>
          <Link
            to="/tasks"
            className="text-xs font-bold text-brand-600 dark:text-brand-300"
          >
            Все задачи
          </Link>
        </div>
        {todayTasks.length === 0 ? (
          <Card className="text-center text-sm text-slate-400">
            На сегодня задач нет — можно отдохнуть
          </Card>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-xl transition-all duration-300 hover:translate-x-1 dark:border-white/10 dark:bg-white/[0.06]"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${priorityDot(task.priority)}`}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                  {task.title}
                </span>
                <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  {dueLabelWithTime(task.dueDate, task.dueTime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Привычки сегодня */}
      {habits.length > 0 && (
        <section className="animate-slide-up">
          <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <FlameIcon size={16} className="text-orange-500" /> Привычки
          </h3>
            <Link
              to="/habits"
              className="text-xs font-bold text-brand-600 dark:text-brand-300"
            >
              Все привычки
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {habits.slice(0, 6).map((habit) => (
              <HabitMini key={habit.id} habit={habit} today={today} />
            ))}
          </div>
        </section>
      )}

      {/* Последние заметки */}
      <section className="animate-slide-up">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <NoteIcon size={16} className="text-brand-500" /> Последние заметки
          </h3>
          <Link
            to="/notes"
            className="text-xs font-bold text-brand-600 dark:text-brand-300"
          >
            Все заметки
          </Link>
        </div>
        {recentNotes.length === 0 ? (
          <Card className="text-center text-sm text-slate-400">
            Заметок пока нет — создайте первую
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                to="/notes"
                className="group rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.06]"
              >
                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
                  {note.title || 'Без названия'}
                </p>
                <p className="mt-1 line-clamp-3 min-h-[2.5rem] text-xs text-slate-500 dark:text-slate-400">
                  {note.body || 'Пустая заметка'}
                </p>
                {note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.slice(0, 2).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function HabitMini({ habit, today }: { habit: Habit; today: string }) {
  const done = habit.history.includes(today)
  const streak = habitStreak(habit.history)
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 backdrop-blur-xl transition-all duration-300 ${
        done
          ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-white/60 bg-white/70 dark:border-white/10 dark:bg-white/[0.06]'
      }`}
    >
      <span className="text-xl">{habit.icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
          {habit.name}
        </p>
        <p className="text-[10px] text-slate-400">
          {done ? '✓ сегодня' : 'не отмечено'}
        </p>
      </div>
      {streak > 0 && (
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-orange-500">
          <FlameIcon size={12} />
          {streak}
        </span>
      )}
    </div>
  )
}