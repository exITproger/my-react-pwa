/**
 * Простейшее хранилище пользователей и данных синхронизации.
 *
 * Хранит всё в одном JSON-файле рядом с кодом. Удобно для локального запуска,
 * НО на Vercel файловая система эфемерна: серверные функции не могут писать
 * файлы между запусками. Поэтому для деплоя на Vercel используйте
 * serverless-версию сервера (server/api/index.js) с хранилищем в памяти
 * или подключите внешнюю базу (Upstash Redis / Vercel KV / Turso).
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_FILE = join(__dirname, 'db.json')

/** Максимальный размер данных пользователя (в символах JSON). */
export const MAX_DATA_SIZE = 2 * 1024 * 1024 // 2 MB

let db = { users: {}, data: {} }

if (existsSync(DB_FILE)) {
  try {
    db = JSON.parse(readFileSync(DB_FILE, 'utf8'))
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

export function getUser(username) {
  return db.users[username.toLowerCase()] || null
}

export function createUser(username, passwordHash) {
  const key = username.toLowerCase()
  db.users[key] = { passwordHash, createdAt: Date.now() }
  save()
}

export function getData(username) {
  return db.data[username.toLowerCase()] || null
}

export function setData(username, data) {
  db.data[username.toLowerCase()] = data
  save()
}
