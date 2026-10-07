import { useState } from 'react'
import { habitsStore, useHabits } from '../lib/storage'
import {
  createId,
  habitBestStreak,
  habitStreak,
  toDateKey,
  weekDates,
  type Habit,
} from '../lib/types'
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
} from '../components/ui'

const HABIT_ICONS = ['💪', '📚', '🧘', '💧', '🏃', '🌙', '🥗', '🎯', '✍️', '🎸']

export default function Habits() {
  const habits = useHabits()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💪')
  const [weekOffset, setWeekOffset] = useState(0)

  const days = weekDates(weekOffset)
  const todayKey = toDateKey(new Date())

  function addHabit() {
    const text = name.trim()
    if (!text) return
    const habit: Habit = {
      id: createId(),
      name: text,
      icon,
      history: [],
      createdAt: Date.now(),
    }
    habitsStore.set([...habits, habit])
    setName('')
  }

  function toggleDay(habitId: string, dateKey: string) {
    habitsStore.set(
      habits.map((h) => {
        if (h.id !== habitId) return h
        const has = h.history.includes(dateKey)
        return {
          ...h,
          history: has
            ? h.history.filter((d) => d !== dateKey)
            : [...h.history, dateKey],
        }
      }),
    )
  }

  function removeHabit(id: string) {
    habitsStore.set(habits.filter((h) => h.id !== id))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Привычки"
        subtitle={`${habits.length} привычек · отмечайте каждый день`}
      />

      {/* Добавление */}
      <Card className="animate-slide-up">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {HABIT_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition-all duration-200 hover:scale-110 ${
                  icon === i
                    ? 'bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/30'
                    : 'bg-black/5 dark:bg-white/5'
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex flex-1 gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHabit()}
              placeholder="Новая привычка…"
            />
            <Button onClick={addHabit}>＋</Button>
          </div>
        </div>
      </Card>

      {habits.length === 0 ? (
        <EmptyState
          icon="🔥"
          title="Привычек пока нет"
          hint="Добавьте первую привычку и отмечайте выполнение каждый день"
        />
      ) : (
        <>
          {/* Навигация по неделям */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset((w) => w - 1)}
            >
              ← Прошлая
            </Button>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {weekOffset === 0
                ? 'Текущая неделя'
                : weekOffset < 0
                  ? `${Math.abs(weekOffset)} нед. назад`
                  : `${weekOffset} нед. вперёд`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset((w) => w + 1)}
            >
              Следующая →
            </Button>
          </div>

          {/* Сетка привычек */}
          <div className="space-y-3">
            {habits.map((habit, i) => {
              const streak = habitStreak(habit.history)
              const best = habitBestStreak(habit.history)
              const doneThisWeek = days.filter((d) =>
                habit.history.includes(toDateKey(d)),
              ).length
              return (
                <Card
                  key={habit.id}
                  className="animate-slide-up"
                  hover
                >
                  <div
                    style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/10 to-violet-500/10 text-xl">
                        {habit.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-slate-800 dark:text-slate-100">
                          {habit.name}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <span className="text-orange-500">🔥 {streak} дн.</span>
                          <span className="text-slate-400">рекорд {best}</span>
                          <span className="text-slate-400">
                            за неделю {doneThisWeek}/7
                          </span>
                        </div>
                      </div>
                      <IconButton onClick={() => removeHabit(habit.id)}>
                        🗑️
                      </IconButton>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {days.map((day) => {
                        const key = toDateKey(day)
                        const active = habit.history.includes(key)
                        const isToday = key === todayKey
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleDay(habit.id, key)}
                            className={`flex flex-col items-center gap-1 rounded-xl py-2 transition-all duration-200 active:scale-90 ${
                              active
                                ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-md shadow-brand-500/30'
                                : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                            } ${
                              isToday && !active
                                ? 'ring-2 ring-brand-400'
                                : ''
                            }`}
                          >
                            <span
                              className={`text-[10px] font-bold capitalize ${
                                active ? 'text-white/80' : 'text-slate-400'
                              }`}
                            >
                              {day.toLocaleDateString('ru-RU', {
                                weekday: 'short',
                              })}
                            </span>
                            <span
                              className={`text-sm font-extrabold ${
                                active ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              {day.getDate()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
