/**
 * Простейшее файловое хранилище пользователей, сессий и данных синхронизации.
 *
 * Всё лежит в одном JSON-файле рядом с кодом. Подходит для локального запуска
 * и для одного постоянного сервера, НО на Vercel файловая система эфемерна:
 * функции не могут писать файлы между запусками. Для деплоя на Vercel
 * используется Redis-хранилище (см. server/index.js).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_FILE = join(__dirname, 'db.json')

/** Максимальный размер данных пользователя (в символах JSON). */
export const MAX_DATA_SIZE = 2 * 1024 * 1024 // 2 MB

function emptyDb() {
  return { users: {}, data: {}, sessions: {} }
}

let db = emptyDb()

if (existsSync(DB_FILE)) {
  try {
    const parsed = JSON.parse(readFileSync(DB_FILE, 'utf8'))
    db = {
      users: parsed?.users && typeof parsed.users === 'object' ? parsed.users : {},
      data: parsed?.data && typeof parsed.data === 'object' ? parsed.data : {},
      sessions:
        parsed?.sessions && typeof parsed.sessions === 'object'
          ? parsed.sessions
          : {},
    }
  } catch {
    console.error('Не удалось прочитать db.json — начинаем с пустой базы')
  }
}

function save() {
  try {
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (error) {
    console.error('Не удалось сохранить db.json', error)
  }
}

function key(username) {
  return String(username || '').toLowerCase()
}

export function getUser(username) {
  return db.users[key(username)] || null
}

/** record: { passwordHash: string, createdAt: number } */
export function setUser(username, record) {
  db.users[key(username)] = record
  save()
}

export function getData(username) {
  return db.data[key(username)] || null
}

export function setData(username, data) {
  db.data[key(username)] = data
  save()
}

/* -------------------------------- Сессии --------------------------------- */

function pruneSessions() {
  const now = Date.now()
  let changed = false
  for (const [token, session] of Object.entries(db.sessions)) {
    if (!session || (session.expiresAt && session.expiresAt <= now)) {
      delete db.sessions[token]
      changed = true
    }
  }
  return changed
}

export function getSession(token) {
  const session = db.sessions[token]
  if (!session) return null
  if (session.expiresAt && session.expiresAt <= Date.now()) {
    delete db.sessions[token]
    save()
    return null
  }
  return session
}

export function setSession(token, username, expiresAt) {
  db.sessions[token] = { username: key(username), expiresAt }
  pruneSessions()
  save()
}

export function deleteSession(token) {
  if (db.sessions[token]) {
    delete db.sessions[token]
    save()
  }
}
