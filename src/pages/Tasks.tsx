import { useMemo, useState } from 'react'
import { tasksStore, useTasks } from '../lib/storage'
import {
  collectTags,
  createId,
  dueLabelWithTime,
  dueStatus,
  toDateKey,
  type DueStatus,
  type Subtask,
  type Task,
  type TaskPriority,
} from '../lib/types'
import {
  requestNotificationPermission,
  useNotifications,
} from '../lib/notifications'
import {
  Button,
  Dropdown,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  ProgressBar,
  Tag,
  Textarea,
  useLockBodyScroll,
} from '../components/ui'
import {
  BellIcon,
  CheckCircleIcon,
  CloseIcon,
  TrashIcon,
} from '../components/icons'

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
  const { permission, request: requestPermission } = useNotifications()
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [remind, setRemind] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  /** Задача, открытая в модалке редактирования. */
  const [editing, setEditing] = useState<Task | null>(null)

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
      dueTime: dueDate && dueTime ? dueTime : undefined,
      remind: remind || undefined,
      tags: [],
      subtasks: [],
      createdAt: Date.now(),
    }
    tasksStore.set([task, ...tasks])
    setTitle('')
    setDueDate('')
    setDueTime('')
    setRemind(false)
    if (remind) void requestPermission()
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
      <div className="animate-slide-up rounded-3xl border border-white/60 bg-white/70 p-5 shadow-[0_8px_30px_-12px_rgba(221,95,146,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06]">
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
      <div className="animate-slide-up space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Что нужно сделать?"
            className="flex-1"
          />
          <Dropdown
            value={priority}
            onChange={(v) => setPriority(v as TaskPriority)}
            options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
            className="sm:w-32"
          />
          <Button onClick={addTask}>＋</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-auto flex-1 sm:flex-none"
          />
          <Input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className="w-auto flex-1 sm:flex-none disabled:opacity-50"
            title="Время дедлайна"
          />
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-2xl border border-white/60 bg-white/60 px-3 py-2 text-xs font-semibold text-slate-600 transition dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <input
              type="checkbox"
              checked={remind}
              disabled={!dueDate}
              onChange={(e) => setRemind(e.target.checked)}
              className="h-4 w-4 accent-brand-500 disabled:opacity-40"
            />
            <BellIcon size={14} /> Напомнить
          </label>
        </div>
        {remind && permission !== 'granted' && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            {permission === 'default' && (
              <>
                <span>Разрешите уведомления — иначе напоминание не покажется.</span>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => void requestPermission()}
                >
                  Разрешить
                </Button>
              </>
            )}
            {permission === 'denied' && (
              <span>
                Уведомления заблокированы в настройках браузера. Напоминание
                появится внутри приложения, когда оно открыто.
              </span>
            )}
            {permission === 'unsupported' && (
              <span>
                Браузер не поддерживает системные уведомления. На iPhone
                установите приложение на экран «Домой» — тогда напоминания
                смогут приходить.
              </span>
            )}
          </div>
        )}
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
                  ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow'
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
                    ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow'
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
          icon={CheckCircleIcon}
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
                className="animate-slide-up overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-md dark:border-white/10 dark:bg-white/6"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(task.id)}
                    aria-label="Отметить"
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 text-xs transition-all duration-200 active:scale-90 ${
                      task.done
                        ? 'border-brand-500 bg-linear-to-br from-brand-400 to-brand-600 text-white'
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
                      className="truncate text-sm font-medium text-slate-700 dark:text-slate-200"
                      title={task.title}
                    >
                      {task.title}
                    </p>
                    {(task.tags.length > 0 || task.subtasks.length > 0 || task.notes) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {task.notes && (
                          <span className="max-w-[320px] truncate text-[11px] text-slate-400 dark:text-slate-500">
                            📎 {task.notes}
                          </span>
                        )}
                        {task.subtasks.length > 0 && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            ☑ {subDone}/{task.subtasks.length}
                          </span>
                        )}
                        {task.tags.map((tag) => (
                          <Tag key={tag}>{tag}</Tag>
                        ))}
                        {task.remind && (
                          <span className="text-[11px]" title="Напоминание включено">
                            <BellIcon size={13} />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {task.dueDate && (
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${DUE_STYLE[status]}`}
                      title={dueLabelWithTime(task.dueDate, task.dueTime)}
                    >
                      {dueLabelWithTime(task.dueDate, task.dueTime)}
                    </span>
                  )}
                  <IconButton
                    className="h-8 w-8 shrink-0 text-xs"
                    onClick={() => setEditing(task)}
                    title="Редактировать"
                  >
                    ✏️
                  </IconButton>
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
                    <TrashIcon size={16} />
                  </IconButton>
                </div>

                {isOpen && (
                  <div className="animate-fade-in border-t border-black/5 px-4 py-3 dark:border-white/10">
                    {/* Заметки по задаче */}
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Заметки</span>
                      <p className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                        {task.notes || '—'}
                      </p>
                    </div>
                    {/* Подзадачи */}
                    <div className="mt-3 space-y-1.5">
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
                            <CloseIcon size={13} />
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

      {/* Модалка редактирования задачи */}
      {editing && (
        <TaskEditor
          task={editing}
          onSave={(changes) => {
            patch(editing.id, changes)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
          onRemove={(id) => {
            remove(id)
            setEditing(null)
          }}
        />
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

/** Модалка редактирования задачи. */
function TaskEditor({
  task,
  onSave,
  onClose,
  onRemove,
}: {
  task: Task
  onSave: (changes: Partial<Task>) => void
  onClose: () => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState({ ...task })
  const [tagInput, setTagInput] = useState('')
  useLockBodyScroll(true)

  function save() {
    onSave({
      title: draft.title.trim() || task.title,
      dueDate: draft.dueDate || undefined,
      dueTime: draft.dueTime || undefined,
      remind: draft.remind || undefined,
      notes: draft.notes || undefined,
      priority: draft.priority,
    })
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!t || draft.tags.includes(t)) {
      setTagInput('')
      return
    }
    setDraft({ ...draft, tags: [...draft.tags, t] })
    setTagInput('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      style={{ height: '100dvh' }}
      onClick={onClose}
    >
      <div
        className="animate-slide-up max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/60 bg-white/95 p-5 shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-slate-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Редактировать задачу
          </h3>
          <IconButton onClick={onClose}>
            <CloseIcon size={16} />
          </IconButton>
        </div>

        <Input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Заголовок"
          className="mb-3 text-base font-bold"
          autoFocus
        />

        <div className="mb-3 grid grid-cols-2 gap-2">
          <Input
            type="date"
            value={draft.dueDate || ''}
            onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })}
          />
          <Input
            type="time"
            value={draft.dueTime || ''}
            onChange={(e) => setDraft({ ...draft, dueTime: e.target.value })}
          />
        </div>

        <div className="mb-3 flex items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={!!draft.remind}
              onChange={(e) => {
                setDraft({ ...draft, remind: e.target.checked })
                if (e.target.checked) void requestNotificationPermission()
              }}
              className="h-4 w-4 accent-brand-500"
            />
              <BellIcon size={14} /> Напомнить
            </label>
          <Dropdown
            value={draft.priority}
            onChange={(v) => setDraft({ ...draft, priority: v as TaskPriority })}
            options={Object.entries(PRIORITY_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
            className="w-32"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            Заметки по задаче
          </label>
          <Textarea
            value={draft.notes || ''}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Любые заметки, идеи, ссылки…"
            rows={4}
            className="text-sm"
          />
        </div>

        {/* Теги */}
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {draft.tags.map((tag) => (
              <Tag
                key={tag}
                onRemove={() =>
                  setDraft({
                    ...draft,
                    tags: draft.tags.filter((t) => t !== tag),
                  })
                }
              >
                {tag}
              </Tag>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder="Добавить тег"
              className="text-xs"
            />
            <Button size="sm" variant="soft" onClick={addTag}>
              #
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onRemove(task.id)
            }}
          >
            <TrashIcon size={16} /> Удалить
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={save}>Сохранить</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
