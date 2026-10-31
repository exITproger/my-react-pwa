/**
 * Единая точка входа API (работает и на Vercel, и локально).
 *
 * Маршруты:
 *   POST /api/auth/register  { username, password } -> { token }
 *   POST /api/auth/login     { username, password } -> { token }
 *   GET  /api/sync           Authorization: Bearer <token> -> { data }
 *   PUT  /api/sync           Authorization: Bearer <token> + body -> { ok }
 *
 * Хранилище:
 *   - локально (NODE_ENV != production или есть FILE_DB=1): JSON-файл db.json;
 *   - на Vercel: файловая система эфемерна, поэтому данные держатся в памяти
 *     инстанса функции. Чтобы синхронизация переживала холодные старты,
 *     подключите постоянную базу (Vercel KV / Upstash Redis / Turso) — см.
 *     комментарий в createStorage().
 */
import { createHash, randomUUID, timingSafeEqual } from 'crypto'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/* ------------------------------ Хранилище -------------------------------- */

function createMemoryStorage() {
  /** @type {Map<string, {passwordHash: string, createdAt: number}>} */
  const users = new Map()
  /** @type {Map<string, any>} */
  const data = new Map()
  return {
    kind: 'memory',
    getUser: (u) => users.get(u) ?? null,
    setUser: (u, rec) => users.set(u, rec),
    getData: (u) => data.get(u) ?? null,
    setData: (u, d) => data.set(u, d),
  }
}

function createFileStorage() {
  const db = require('./db.js')
  return {
    kind: 'file',
    getUser: (u) => db.getUser(u),
    setUser: (u, rec) => db.createUser(u, rec),
    getData: (u) => db.getData(u),
    setData: (u, d) => db.setData(u, d),
  }
}

let storage = null
function getStorage() {
  if (storage) return storage
  const useFile =
    process.env.FILE_DB === '1' ||
    (process.env.NODE_ENV !== 'production' && !process.env.VERCEL)
  storage = useFile ? createFileStorage() : createMemoryStorage()
  return storage
}

/* ------------------------------- Утилиты --------------------------------- */

const MAX_DATA_SIZE = 2 * 1024 * 1024 // 2 MB
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 90 // 90 дней

/** Активные токены: token -> username. */
const tokens = new Map()

function hash(password) {
  return createHash('sha256').update(password).digest('hex')
}

function safeEqual(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > MAX_DATA_SIZE) {
        reject(new Error('too_large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('bad_json'))
      }
    })
    req.on('error', reject)
  })
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  header.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=')
    if (k) out[k] = decodeURIComponent(v.join('='))
  })
  return out
}

function setCookie(res, name, value) {
  res.setHeader(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TOKEN_TTL / 1000}`,
  )
}

function usernameFromReq(req) {
  const auth = req.headers.authorization || ''
  let token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    token = parseCookies(req.headers.cookie)['den_token'] || null
  }
  if (!token) return null
  const user = tokens.get(token)
  if (!user) return null
  return user
}

function normalizeUsername(u) {
  return String(u || '')
    .trim()
    .toLowerCase()
    .slice(0, 40)
}

/* ------------------------------ Логика API ------------------------------- */

async function handleAuth(req, res, mode) {
  let body
  try {
    body = await readJson(req)
  } catch {
    return json(res, 400, { error: 'Некорректные данные' })
  }
  const username = normalizeUsername(body?.username)
  const password = String(body?.password || '')

  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
    return json(res, 400, {
      error: 'Логин: 3–40 символов, латиница, цифры, _ . -',
    })
  }
  if (password.length < 4) {
    return json(res, 400, { error: 'Пароль должен быть не короче 4 символов' })
  }

  const store = getStorage()
  const existing = store.getUser(username)

  if (mode === 'register') {
    if (existing) return json(res, 409, { error: 'Такой пользователь уже есть' })
    store.setUser(username, { passwordHash: hash(password), createdAt: Date.now() })
  } else {
    if (!existing || !safeEqual(existing.passwordHash, hash(password))) {
      return json(res, 401, { error: 'Неверный логин или пароль' })
    }
  }

  const token = randomUUID()
  tokens.set(token, username)
  setCookie(res, 'den_token', token)
  return json(res, 200, { token })
}

async function handleSync(req, res) {
  const username = usernameFromReq(req)
  if (!username) return json(res, 401, { error: 'Не авторизован' })

  const store = getStorage()

  if (req.method === 'GET') {
    return json(res, 200, { data: store.getData(username) })
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body
    try {
      body = await readJson(req)
    } catch (e) {
      if (e.message === 'too_large') {
        return json(res, 413, { error: 'Слишком большой объём данных' })
      }
      return json(res, 400, { error: 'Некорректный JSON' })
    }
    if (!body || typeof body !== 'object') {
      return json(res, 400, { error: 'Пустые данные' })
    }
    const payload = {
      notes: Array.isArray(body.notes) ? body.notes : [],
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
      habits: Array.isArray(body.habits) ? body.habits : [],
      settings: body.settings && typeof body.settings === 'object' ? body.settings : {},
      updatedAt: Number(body.updatedAt) || Date.now(),
    }
    store.setData(username, payload)
    return json(res, 200, { ok: true })
  }

  return json(res, 405, { error: 'Метод не поддерживается' })
}

/**
 * Общая обработка запроса. Возвращает true, если запрос обработан.
 * Используется и в Express-обёртке (локально), и в версельной функции.
 */
export async function handleRequest(req, res, pathname) {
  const path = (pathname || '').replace(/\/+$/, '')
  if (path === '/api/auth/register') return handleAuth(req, res, 'register'), true
  if (path === '/api/auth/login') return handleAuth(req, res, 'login'), true
  if (path === '/api/sync') return handleSync(req, res), true
  return false
}

/* ------------------------- Локальный запуск (Express) -------------------- */

async function serveLocal() {
  // eslint-disable-next-line
  const express = require('express')
  const path = require('path')
  const { fileURLToPath } = await import('url')
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  const app = express()
  const port = process.env.PORT || 8787

  app.use(async (req, res, next) => {
    const handled = await handleRequest(req, res, req.path)
    if (!handled) next()
  })

  // Раздача собранного клиента (../dist), чтобы всё работало на одном порту.
  const dist = path.resolve(__dirname, '../dist')
  if (existsSyncSafe(dist)) {
    app.use(express.static(dist))
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  app.listen(port, () => {
    console.log(`Мой день: сервер запущен на http://localhost:${port}`)
  })
}

function existsSyncSafe(p) {
  try {
    // eslint-disable-next-line
    return require('fs').existsSync(p)
  } catch {
    return false
  }
}

// При прямом запуске (`node server/index.js`) поднимаем локальный сервер.
const isDirectRun =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('server/index.js')

if (isDirectRun) serveLocal()

export default async function handler(req, res) {
  const handled = await handleRequest(
    req,
    res,
    (req.url || '').split('?')[0],
  )
  if (!handled) json(res, 404, { error: 'Не найдено' })
}
