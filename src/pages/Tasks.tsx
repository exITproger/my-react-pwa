import { useMemo, useState } from 'react'
import { tasksStore, useTasks } from '../lib/storage'
import {
  collectTags,
  createId,
  dueLabel,
  dueStatus,
  toDateKey,
  type DueStatus,
  type Subtask,
  type Task,
  type TaskPriority,
} from '../lib/types'
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  ProgressBar,
  Select,
  Tag,
} from '../components/ui'

type Filter = 'all' | 'active' | 'done' | 'today'

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
}

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-500',
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

const DUE_STYLE: Record<DueStatus, string> = {
  none: '',
  overdue: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  today: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  tomorrow: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  soon: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-100',
  later: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
}

export default function Tasks() {
  const tasks = useTasks()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const today = toDateKey(new Date())
  const doneCount = tasks.filter((t) => t.done).length
  const progress = tasks.length ? (doneCount / tasks.length) * 100 : 0
  const allTags = useMemo(() => collectTags(tasks), [tasks])

  const filtered = useMemo(() => {
    let list = tasks
    if (filter === 'active') list = list.filter((t) => !t.done)
    else if (filter === 'done') list = list.filter((t) => t.done)
    else if (filter === 'today')
      list = list.filter((t) => !t.done && t.dueDate && t.dueDate <= today)
    if (activeTag) list = list.filter((t) => t.tags.includes(activeTag))
    return [...list].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      const aDue = a.dueDate ?? '9999'
      const bDue = b.dueDate ?? '9999'
      if (aDue !== bDue) return aDue < bDue ? -1 : 1
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    })
  }, [tasks, filter, activeTag, today])

  function addTask() {
    const text = title.trim()
    if (!text) return
    const task: Task = {
      id: createId(),
      title: text,
      done: false,
      priority,
      dueDate: dueDate || undefined,
      tags: [],
      subtasks: [],
      createdAt: Date.now(),
    }
    tasksStore.set([task, ...tasks])
    setTitle('')
    setDueDate('')
  }

  function patch(id: string, changes: Partial<Task>) {
    tasksStore.set(tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)))
  }

  function toggle(id: string) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    patch(id, {
      done: !task.done,
      completedAt: !task.done ? Date.now() : undefined,
    })
  }

  function remove(id: string) {
    tasksStore.set(tasks.filter((t) => t.id !== id))
  }

  function addSubtask(taskId: string, subTitle: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task || !subTitle.trim()) return
    const sub: Subtask = { id: createId(), title: subTitle.trim(), done: false }
    patch(taskId, { subtasks: [...task.subtasks, sub] })
  }

  function toggleSubtask(taskId: string, subId: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    patch(taskId, {
      subtasks: task.subtasks.map((s) =>
        s.id === subId ? { ...s, done: !s.done } : s,
      ),
    })
  }

  function removeSubtask(taskId: string, subId: string) {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    patch(taskId, { subtasks: task.subtasks.filter((s) => s.id !== subId) })
  }

  function addTagToTask(taskId: string, tag: string) {
    const task = tasks.find((t) => t.id === taskId)
    const t = tag.trim().replace(/^#/, '').toLowerCase()
    if (!task || !t || task.tags.includes(t)) return
    patch(taskId, { tags: [...task.tags, t] })
  }

  function clearDone() {
    tasksStore.set(tasks.filter((t) => !t.done))
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Задачи"
        subtitle={`${doneCount} из ${tasks.length} выполнено`}
        action={
          doneCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={clearDone}>
              Убрать выполненные
            </Button>
          ) : undefined
        }
      />

      {/* Прогресс */}
      <div className="animate-slide-up rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_30px_-12px_rgba(79,70,229,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-bold text-slate-700 dark:text-slate-200">
            Общий прогресс
          </span>
          <span className="font-extrabold text-brand-600 dark:text-brand-300">
            {Math.round(progress)}%
          </span>
        </div>
        <ProgressBar value={progress} />
      </div>

      {/* Добавление */}
      <div className="animate-slide-up flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Что нужно сделать?"
          className="flex-1"
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="sm:w-40"
        />
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="sm:w-32"
        >
          {Object.entries(PRIORITY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button onClick={addTask}>＋</Button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-2xl border border-white/60 bg-white/60 p-1 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {(
            [
              ['all', 'Все'],
              ['active', 'Активные'],
              ['today', 'Сегодня'],
              ['done', 'Готово'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
                filter === value
                  ? 'bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                  activeTag === tag
                    ? 'bg-gradient-to-r from-brand-500 to-violet-500 text-white shadow'
                    : 'bg-white/70 text-slate-500 hover:bg-white dark:bg-white/5 dark:text-slate-400'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="✅"
          title={
            filter === 'done'
              ? 'Выполненных задач нет'
              : filter === 'today'
                ? 'На сегодня задач нет'
                : 'Задач нет'
          }
          hint="Добавьте задачу в поле выше"
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((task, i) => {
            const isOpen = expanded === task.id
            const subDone = task.subtasks.filter((s) => s.done).length
            const status = dueStatus(task.dueDate)
            return (
              <li
                key={task.id}
                style={{ animationDelay: `${Math.min(i * 30, 210)}ms` }}
                className="animate-slide-up overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.06]"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(task.id)}
                    aria-label="Отметить"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-xs transition-all duration-200 active:scale-90 ${
                      task.done
                        ? 'border-brand-500 bg-gradient-to-br from-brand-500 to-violet-500 text-white'
                        : 'border-black/15 hover:border-brand-400 dark:border-white/25'
                    }`}
                  >
                    {task.done && '✓'}
                  </button>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[task.priority]}`}
                    title={PRIORITY_LABEL[task.priority]}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`break-words text-sm font-medium [overflow-wrap:anywhere] ${
                        task.done
                          ? 'text-slate-400 line-through'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {task.title}
                    </p>
                    {(task.tags.length > 0 || task.subtasks.length > 0) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {task.subtasks.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            ☑ {subDone}/{task.subtasks.length}
                          </span>
                        )}
                        {task.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                      </div>
                    )}
                  </div>
                  {task.dueDate && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${DUE_STYLE[status]}`}
                    >
                      {dueLabel(task.dueDate)}
                    </span>
                  )}
                  <IconButton
                    className="h-8 w-8 shrink-0 text-xs"
                    onClick={() => setExpanded(isOpen ? null : task.id)}
                    title="Подробнее"
                  >
                    {isOpen ? '▲' : '▾'}
                  </IconButton>
                  <IconButton
                    className="h-8 w-8 shrink-0 text-xs"
                    onClick={() => remove(task.id)}
                    title="Удалить"
                  >
                    🗑️
                  </IconButton>
                </div>

                {isOpen && (
                  <div className="animate-fade-in border-t border-black/5 px-4 py-3 dark:border-white/10">
                    {/* Подзадачи */}
                    <div className="space-y-1.5">
                      {task.subtasks.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSubtask(task.id, sub.id)}
                            className={`grid h-4 w-4 shrink-0 place-items-center rounded border text-[9px] transition ${
                              sub.done
                                ? 'border-brand-500 bg-brand-500 text-white'
                                : 'border-black/20 dark:border-white/25'
                            }`}
                          >
                            {sub.done && '✓'}
                          </button>
                          <span
                            className={`flex-1 text-xs ${
                              sub.done
                                ? 'text-slate-400 line-through'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {sub.title}
                          </span>
                          <IconButton
                            className="h-6 w-6 text-[10px]"
                            onClick={() => removeSubtask(task.id, sub.id)}
                          >
                            ✕
                          </IconButton>
                        </div>
                      ))}
                    </div>
                    <SubtaskInput onAdd={(t) => addSubtask(task.id, t)} />
                    <TagInput onAdd={(t) => addTagToTask(task.id, t)} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SubtaskInput({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="mt-2 flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAdd(value)
            setValue('')
          }
        }}
        placeholder="Добавить подзадачу…"
        className="flex-1 py-1.5 text-xs"
      />
      <Button
        size="sm"
        variant="soft"
        onClick={() => {
          onAdd(value)
          setValue('')
        }}
      >
        ＋
      </Button>
    </div>
  )
}

function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="mt-2 flex gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onAdd(value)
            setValue('')
          }
        }}
        placeholder="Добавить тег…"
        className="flex-1 py-1.5 text-xs"
      />
      <Button
        size="sm"
        variant="soft"
        onClick={() => {
          onAdd(value)
          setValue('')
        }}
      >
        #
      </Button>
    </div>
  )
}
