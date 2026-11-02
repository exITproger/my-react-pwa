import { useMemo, useState } from 'react'
import { notesStore, useNotes } from '../lib/storage'
import {
  collectTags,
  createId,
  NOTE_COLORS,
  NOTE_DOTS,
  type Note,
  type NoteColor,
} from '../lib/types'
import { formatRelative } from '../lib/hooks'
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Tag,
  Textarea,
} from '../components/ui'
import {
  CloseIcon,
  NoteIcon,
  PinIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons'

const COLOR_KEYS = Object.keys(NOTE_COLORS) as NoteColor[]

function emptyNote(): Note {
  return {
    id: createId(),
    title: '',
    body: '',
    color: 'default',
    tags: [],
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export default function Notes() {
  const notes = useNotes()
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [draft, setDraft] = useState<Note | null>(null)
  const [tagInput, setTagInput] = useState('')
  /** Заметка, для которой открыто подтверждение удаления. */
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const allTags = useMemo(() => collectTags(notes), [notes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = notes
    if (q) {
      list = list.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }
    if (activeTag) list = list.filter((n) => n.tags.includes(activeTag))
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.updatedAt - a.updatedAt
    })
  }, [notes, query, activeTag])

  function openNew() {
    setDraft(emptyNote())
    setTagInput('')
    setConfirmId(null)
  }

  function openEdit(note: Note) {
    setDraft(note)
    setTagInput('')
    setConfirmId(null)
  }

  function saveDraft() {
    if (!draft) return
    if (!draft.title.trim() && !draft.body.trim()) {
      setDraft(null)
      return
    }
    const exists = notes.some((n) => n.id === draft.id)
    const next = { ...draft, updatedAt: Date.now() }
    notesStore.set(
      exists
        ? notes.map((n) => (n.id === draft.id ? next : n))
        : [next, ...notes],
    )
    setDraft(null)
  }

  function remove(id: string) {
    notesStore.set(notes.filter((n) => n.id !== id))
    if (draft?.id === id) setDraft(null)
    setConfirmId(null)
  }

  function togglePin(id: string) {
    notesStore.set(
      notes.map((n) =>
        n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n,
      ),
    )
  }

  function addTag() {
    if (!draft) return
    const t = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!t || draft.tags.includes(t)) {
      setTagInput('')
      return
    }
    setDraft({ ...draft, tags: [...draft.tags, t] })
    setTagInput('')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Заметки"
        subtitle={`${notes.length} заметок · хранятся на устройстве`}
        action={<Button onClick={openNew}>Новая заметка</Button>}
      />

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon size={16} />
        </span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по заголовку, тексту или тегам…"
          className="pl-10"
        />
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
              activeTag === null
                ? 'bg-gradient-to-r from-brand-400 to-brand-600 text-white shadow'
                : 'bg-white/70 text-slate-500 hover:bg-white dark:bg-white/5 dark:text-slate-400'
            }`}
          >
            Все
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag === activeTag ? null : tag)}
              className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
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

      {/* Модальный редактор */}
      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setDraft(null)}
        >
          <div
            className="animate-slide-up max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/60 bg-white/95 p-5 shadow-2xl sm:rounded-3xl dark:border-white/10 dark:bg-slate-900/95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {notes.some((n) => n.id === draft.id)
                  ? 'Редактировать'
                  : 'Новая заметка'}
              </h3>
              <IconButton onClick={() => setDraft(null)}>
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
            <Textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              placeholder="Текст заметки…"
              rows={6}
              className="mb-3"
            />

            {/* Теги */}
            <div className="mb-3">
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
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Добавить тег и нажать Enter"
                className="text-xs"
              />
            </div>

            {/* Цвет */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Цвет:</span>
              {COLOR_KEYS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => setDraft({ ...draft, color })}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${NOTE_COLORS[color]} ${
                    draft.color === color
                      ? 'border-brand-500 scale-110'
                      : 'border-black/10 dark:border-white/20'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              {notes.some((n) => n.id === draft.id) ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => remove(draft.id)}
                >
                  <TrashIcon size={16} /> Удалить
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)}>
                  Отмена
                </Button>
                <Button onClick={saveDraft}>Сохранить</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={NoteIcon}
          title={query || activeTag ? 'Ничего не найдено' : 'Заметок пока нет'}
          hint={
            query || activeTag ? undefined : 'Нажмите «Новая заметка», чтобы начать'
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note, i) => (
            <li
              key={note.id}
              style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              className={`animate-slide-up group relative flex flex-col overflow-hidden rounded-3xl border border-white/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl dark:border-white/10 ${NOTE_COLORS[note.color]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${NOTE_DOTS[note.color]}`}
                  />
                  <h3 className="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">
                    {note.title || 'Без названия'}
                  </h3>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <IconButton
                    className="h-8 w-8 text-xs"
                    onClick={() => togglePin(note.id)}
                    title={note.pinned ? 'Открепить' : 'Закрепить'}
                    aria-label={note.pinned ? 'Открепить' : 'Закрепить'}
                  >
                    {note.pinned ? <PinIcon size={15} /> : <PinIcon size={15} className="opacity-40" />}
                  </IconButton>
                  <IconButton
                    className="h-8 w-8 text-xs hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                    onClick={() =>
                      setConfirmId(confirmId === note.id ? null : note.id)
                    }
                    title="Удалить заметку"
                    aria-label="Удалить заметку"
                  >
                    <TrashIcon size={15} />
                  </IconButton>
                </div>
              </div>

              {confirmId === note.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  <span className="flex-1">Удалить заметку?</span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => remove(note.id)}
                  >
                    Удалить
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmId(null)}
                  >
                    Отмена
                  </Button>
                </div>
              )}

              <p className="mt-2 line-clamp-5 min-h-[3.5rem] whitespace-pre-wrap break-words text-sm text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">
                {note.body || 'Пустая заметка'}
              </p>

              {note.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="text-[11px] text-slate-400">
                  {formatRelative(note.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(note)}
                  className="text-xs font-bold text-brand-600 transition hover:translate-x-0.5 dark:text-brand-300"
                >
                  Открыть
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
