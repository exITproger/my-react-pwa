/**
 * Единая точка входа API (работает и на Vercel, и локально).
 *
 * Маршруты:
 *   POST /api/auth/register  { username, password } -> { token, username }
 *   POST /api/auth/login     { username, password } -> { token, username }
 *   POST /api/auth/logout    Authorization: Bearer <token> -> { ok }
 *   GET  /api/sync           Authorization: Bearer <token> -> { data }
 *   PUT  /api/sync           Authorization: Bearer <token> + body -> { ok }
 *   GET  /api/health         -> { ok, storage }
 *
 * Хранилище выбирается автоматически:
 *   1. Redis по REST (Vercel KV / Upstash) — если заданы
 *      KV_REST_API_URL + KV_REST_API_TOKEN либо
 *      UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
 *      Это единственный вариант, который корректно работает на Vercel:
 *      пользователи и сессии видны всем инстансам функции и переживают
 *      холодные старты. Без него телефон и компьютер попадают в разные
 *      инстансы, и вход со второго устройства отвечает «Неверный логин
 *      или пароль».
 *   2. JSON-файл server/db.json — локально или при FILE_DB=1.
 *   3. Память инстанса — крайний случай, только для отладки.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

/* ------------------------------ Хранилище -------------------------------- */

function createMemoryStorage() {
  /** @type {Map<string, {passwordHash: string, createdAt: number}>} */
  const users = new Map()
  /** @type {Map<string, any>} */
  const data = new Map()
  /** @type {Map<string, {username: string, expiresAt: number}>} */
  const sessions = new Map()
  return {
    kind: 'memory',
    async ping() {
      return true
    },
    async getUser(u) {
      return users.get(u) ?? null
    },
    async setUser(u, rec) {
      users.set(u, rec)
    },
    async getData(u) {
      return data.get(u) ?? null
    },
    async setData(u, d) {
      data.set(u, d)
    },
    async getSession(token) {
      const session = sessions.get(token)
      if (!session) return null
      if (session.expiresAt <= Date.now()) {
        sessions.delete(token)
        return null
      }
      return session
    },
    async setSession(token, username, expiresAt) {
      sessions.set(token, { username, expiresAt })
    },
    async deleteSession(token) {
      sessions.delete(token)
    },
  }
}

function createFileStorage(db) {
  return {
    kind: 'file',
    async ping() {
      return true
    },
    async getUser(u) {
      return db.getUser(u)
    },
    async setUser(u, rec) {
      db.setUser(u, rec)
    },
    async getData(u) {
      return db.getData(u)
    },
    async setData(u, d) {
      db.setData(u, d)
    },
    async getSession(token) {
      return db.getSession(token)
    },
    async setSession(token, username, expiresAt) {
      db.setSession(token, username, expiresAt)
    },
    async deleteSession(token) {
      db.deleteSession(token)
    },
  }
}

/**
 * Vercel KV / Upstash Redis через REST API (без дополнительных зависимостей).
 * Ключи: den:user:<login>, den:data:<login>, den:session:<token>.
 */
function createRedisStorage({ url, token }) {
  async function command(...args) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    })
    if (!res.ok) {
      throw new Error(`Redis ответил ${res.status}`)
    }
    const payload = await res.json()
    if (payload?.error) {
      throw new Error(`Redis: ${payload.error}`)
    }
    return payload?.result ?? null
  }

  async function readJson(key) {
    const raw = await command('GET', key)
    if (typeof raw !== 'string' || !raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  return {
    kind: 'redis',
    async ping() {
      const result = await command('PING')
      return String(result).toUpperCase() === 'PONG'
    },
    async getUser(u) {
      return readJson(`den:user:${u}`)
    },
    async setUser(u, rec) {
      await command('SET', `den:user:${u}`, JSON.stringify(rec))
    },
    async getData(u) {
      return readJson(`den:data:${u}`)
    },
    async setData(u, d) {
      await command('SET', `den:data:${u}`, JSON.stringify(d))
    },
    async getSession(t) {
      return readJson(`den:session:${t}`)
    },
    async setSession(t, username, expiresAt) {
      const ttl = Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))
      await command(
        'SET',
        `den:session:${t}`,
        JSON.stringify({ username, expiresAt }),
        'EX',
        String(ttl),
      )
    },
    async deleteSession(t) {
      await command('DEL', `den:session:${t}`)
    },
  }
}

function detectRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

let storagePromise = null

function getStorage() {
  if (!storagePromise) storagePromise = initStorage()
  return storagePromise
}

async function initStorage() {
  const redis = detectRedisConfig()
  if (redis) return createRedisStorage(redis)

  const useFile =
    process.env.FILE_DB === '1' ||
    (process.env.NODE_ENV !== 'production' && !process.env.VERCEL)
  if (useFile) {
    const db = await import('./db.js')
    return createFileStorage(db)
  }

  console.warn(
    '[api] Постоянное хранилище не настроено: данные живут только в памяти ' +
      'инстанса. Задайте KV_REST_API_URL и KV_REST_API_TOKEN (Vercel KV / ' +
      'Upstash Redis), иначе вход со второго устройства не сработает.',
  )
  return createMemoryStorage()
}

/* ------------------------------- Утилиты --------------------------------- */

const MAX_DATA_SIZE = 2 * 1024 * 1024 // 2 MB
const TOKEN_TTL = 1000 * 60 * 60 * 24 * 90 // 90 дней
const SESSION_TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/* -------------------------------- Пароли --------------------------------- */

const SCRYPT_KEYLEN = 64

/** scrypt с индивидуальной солью: scrypt$<salt>$<hash>. */
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return `scrypt$${salt}$${derived}`
}

/** Проверка пароля. Старый формат sha256 поддерживается для миграции. */
function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored) return false
  const [scheme, salt, digest] = stored.split('$')
  if (scheme === 'scrypt' && salt && digest) {
    const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
    return safeEqual(derived, digest)
  }
  const legacy = createHash('sha256').update(password).digest('hex')
  return safeEqual(legacy, stored)
}

function isLegacyHash(stored) {
  return typeof stored === 'string' && !stored.startsWith('scrypt$')
}

/** Хэш-пустышка: выравнивает время ответа для несуществующего логина. */
const DUMMY_PASSWORD_HASH = hashPassword('dummy-password-for-timing')

/* -------------------------------- Ответы --------------------------------- */

function json(res, status, body, extraHeaders = {}) {
  if (res.headersSent) return
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  })
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false

    const fail = (code) => {
      if (settled) return
      settled = true
      req.removeAllListeners('data')
      req.removeAllListeners('end')
      req.resume()
      reject(new Error(code))
    }

    req.on('data', (chunk) => {
      if (settled) return
      size += chunk.length
      if (size > MAX_DATA_SIZE) return fail('too_large')
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) return resolve(null)
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('bad_json'))
      }
    })
    req.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })
  })
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  header.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=')
    if (!k) return
    try {
      out[k] = decodeURIComponent(v.join('='))
    } catch {
      out[k] = v.join('=')
    }
  })
  return out
}

function isSecure(req) {
  return (
    req.headers['x-forwarded-proto'] === 'https' ||
    req.socket?.encrypted === true
  )
}

function setCookie(req, res, name, value, expiresAt) {
  const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000))
  const secure = isSecure(req) ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`,
  )
}

function clearCookie(req, res, name) {
  const secure = isSecure(req) ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `${name}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`,
  )
}

function readToken(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) {
    const token = auth.slice(7).trim()
    if (token) return token
  }
  return parseCookies(req.headers.cookie).den_token || null
}

async function createSession(username) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = Date.now() + TOKEN_TTL
  const store = await getStorage()
  await store.setSession(token, username, expiresAt)
  return { token, expiresAt }
}

async function usernameFromToken(token) {
  if (!token || !SESSION_TOKEN_RE.test(token)) return null
  const store = await getStorage()
  const session = await store.getSession(token)
  if (!session) return null
  if (session.expiresAt && session.expiresAt <= Date.now()) {
    await store.deleteSession(token)
    return null
  }
  return session.username
}

async function usernameFromReq(req) {
  return usernameFromToken(readToken(req))
}

/** EventSource не умеет задавать заголовки — токен можно передать в query. */
function tokenFromQuery(req) {
  const query = (req.url || '').split('?')[1]
  if (!query) return null
  try {
    return new URLSearchParams(query).get('token')
  } catch {
    return null
  }
}

function normalizeUsername(u) {
  return String(u || '')
    .trim()
    .toLowerCase()
    .slice(0, 40)
}

/* ------------------------------ Логика API ------------------------------- */

async function handleAuth(req, res, mode) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Метод не поддерживается' }, { Allow: 'POST' })
  }

  let body
  try {
    body = await readJson(req)
  } catch (error) {
    if (error?.message === 'too_large') {
      return json(res, 413, { error: 'Слишком большой запрос' })
    }
    return json(res, 400, { error: 'Некорректные данные' })
  }

  const username = normalizeUsername(body?.username)
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
    return json(res, 400, {
      error: 'Логин: 3–40 символов, латиница, цифры, _ . -',
    })
  }
  if (password.length < 4) {
    return json(res, 400, { error: 'Пароль должен быть не короче 4 символов' })
  }

  const store = await getStorage()
  const existing = await store.getUser(username)

  if (mode === 'register') {
    if (existing) return json(res, 409, { error: 'Такой пользователь уже есть' })
    await store.setUser(username, {
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    })
  } else {
    if (!existing) {
      // Считаем «пустой» хэш, чтобы время ответа не выдавало наличие логина.
      verifyPassword(password, DUMMY_PASSWORD_HASH)
      return json(res, 401, { error: 'Неверный логин или пароль' })
    }
    if (!verifyPassword(password, existing.passwordHash)) {
      return json(res, 401, { error: 'Неверный логин или пароль' })
    }
    // Прозрачно переводим старые хэши sha256 на scrypt.
    if (isLegacyHash(existing.passwordHash)) {
      await store.setUser(username, {
        ...existing,
        passwordHash: hashPassword(password),
      })
    }
  }

  const { token, expiresAt } = await createSession(username)
  setCookie(req, res, 'den_token', token, expiresAt)
  return json(res, 200, { token, username })
}

async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Метод не поддерживается' }, { Allow: 'POST' })
  }
  const token = readToken(req)
  if (token && SESSION_TOKEN_RE.test(token)) {
    const store = await getStorage()
    await store.deleteSession(token)
  }
  clearCookie(req, res, 'den_token')
  return json(res, 200, { ok: true })
}

async function handleSync(req, res) {
  const username = await usernameFromReq(req)
  if (!username) return json(res, 401, { error: 'Не авторизован' })

  const store = await getStorage()

  if (req.method === 'GET') {
    return json(res, 200, { data: await store.getData(username) })
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    let body
    try {
      body = await readJson(req)
    } catch (error) {
      if (error?.message === 'too_large') {
        return json(res, 413, { error: 'Слишком большой объём данных' })
      }
      return json(res, 400, { error: 'Некорректный JSON' })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return json(res, 400, { error: 'Пустые данные' })
    }
    const payload = {
      notes: Array.isArray(body.notes) ? body.notes : [],
      tasks: Array.isArray(body.tasks) ? body.tasks : [],
      habits: Array.isArray(body.habits) ? body.habits : [],
      settings:
        body.settings &&
        typeof body.settings === 'object' &&
        !Array.isArray(body.settings)
          ? body.settings
          : {},
      updatedAt: Number(body.updatedAt) || Date.now(),
    }
    await store.setData(username, payload)
    // Мгновенно сообщаем остальным устройствам этого же пользователя.
    notifyStream(username, payload.updatedAt)
    return json(res, 200, { ok: true, updatedAt: payload.updatedAt })
  }

  return json(
    res,
    405,
    { error: 'Метод не поддерживается' },
    { Allow: 'GET, PUT' },
  )
}

/* ---------------------- Постоянный канал (SSE) --------------------------- */

/**
 * Открытые подписки: username -> Set<client>.
 * client.send(updatedAt) отправляет событие, если отметка изменилась.
 * @type {Map<string, Set<{send: (updatedAt: number) => void}>>}
 */
const streamClients = new Map()

function notifyStream(username, updatedAt) {
  const clients = streamClients.get(username)
  if (!clients) return
  const value = Number(updatedAt) || 0
  for (const client of [...clients]) {
    client.send(value)
  }
}

const STREAM_POLL_MS = 2000
const STREAM_HEARTBEAT_MS = 20_000
/**
 * На Vercel функция принудительно завершается по maxDuration, поэтому
 * закрываем канал сами чуть раньше — клиент переподключится или перейдёт
 * на автоматический опрос.
 */
const STREAM_MAX_MS = process.env.VERCEL ? 9000 : 0

/**
 * GET /api/stream — держит открытое соединение и присылает событие `sync`,
 * как только данные пользователя на сервере изменились (в т.ч. с другого
 * устройства или другого инстанса функции: отметка перечитывается из
 * хранилища каждые 2 секунды).
 */
async function handleStream(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Метод не поддерживается' }, { Allow: 'GET' })
  }

  const username =
    (await usernameFromReq(req)) ?? (await usernameFromToken(tokenFromQuery(req)))
  if (!username) return json(res, 401, { error: 'Не авторизован' })

  const store = await getStorage()

  let closed = false
  let poll = null
  let heartbeat = null
  let maxTimer = null
  let lastUpdatedAt = 0

  const write = (chunk) => {
    if (closed) return
    try {
      res.write(chunk)
    } catch {
      cleanup()
    }
  }

  function cleanup() {
    if (closed) return
    closed = true
    if (poll) clearInterval(poll)
    if (heartbeat) clearInterval(heartbeat)
    if (maxTimer) clearTimeout(maxTimer)
    const clients = streamClients.get(username)
    if (clients) {
      clients.delete(client)
      if (clients.size === 0) streamClients.delete(username)
    }
    try {
      res.end()
    } catch {
      /* соединение уже закрыто */
    }
  }

  const client = {
    send(updatedAt) {
      if (updatedAt === lastUpdatedAt) return
      lastUpdatedAt = updatedAt
      write(`event: sync\ndata: ${JSON.stringify({ updatedAt })}\n\n`)
    },
  }

  try {
    const data = await store.getData(username)
    lastUpdatedAt = Number(data?.updatedAt) || 0
  } catch {
    lastUpdatedAt = 0
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  if (typeof res.flushHeaders === 'function') res.flushHeaders()

  const clients = streamClients.get(username) ?? new Set()
  clients.add(client)
  streamClients.set(username, clients)

  // Клиент сам переподключится через 3 секунды, если соединение оборвётся.
  write('retry: 3000\n\n')
  write(`event: ready\ndata: ${JSON.stringify({ updatedAt: lastUpdatedAt })}\n\n`)

  poll = setInterval(async () => {
    if (closed) return
    try {
      const data = await store.getData(username)
      client.send(Number(data?.updatedAt) || 0)
    } catch {
      /* хранилище недоступно — попробуем на следующем тике */
    }
  }, STREAM_POLL_MS)

  heartbeat = setInterval(() => write(': ping\n\n'), STREAM_HEARTBEAT_MS)

  if (STREAM_MAX_MS > 0) {
    maxTimer = setTimeout(() => {
      write('event: bye\ndata: {}\n\n')
      cleanup()
    }, STREAM_MAX_MS)
  }

  req.on('close', cleanup)
  res.on('close', cleanup)
  res.on('error', cleanup)
}

async function handleHealth(req, res) {
  if (req.method !== 'GET') {
    return json(res, 405, { error: 'Метод не поддерживается' }, { Allow: 'GET' })
  }
  const store = await getStorage()
  let reachable = false
  let detail = null
  try {
    reachable = await store.ping()
  } catch (error) {
    detail = error instanceof Error ? error.message : String(error)
  }
  return json(res, reachable ? 200 : 503, {
    ok: reachable,
    storage: store.kind,
    reachable,
    ...(detail ? { error: detail } : {}),
  })
}

/**
 * Общая обработка запроса. Возвращает true, если запрос обработан.
 * Используется и в Express-обёртке (локально), и в версельной функции.
 */
export async function handleRequest(req, res, pathname) {
  const path = (pathname || '').replace(/\/+$/, '') || '/'
  try {
    if (path === '/api/auth/register') {
      await handleAuth(req, res, 'register')
      return true
    }
    if (path === '/api/auth/login') {
      await handleAuth(req, res, 'login')
      return true
    }
    if (path === '/api/auth/logout') {
      await handleLogout(req, res)
      return true
    }
    if (path === '/api/sync') {
      await handleSync(req, res)
      return true
    }
    if (path === '/api/stream') {
      await handleStream(req, res)
      return true
    }
    if (path === '/api/health') {
      await handleHealth(req, res)
      return true
    }
    return false
  } catch (error) {
    console.error('[api]', error)
    json(res, 500, { error: 'Внутренняя ошибка сервера' })
    return true
  }
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
    try {
      const handled = await handleRequest(req, res, req.path)
      if (!handled) next()
    } catch (error) {
      next(error)
    }
  })

  // Раздача собранного клиента (../dist), чтобы всё работало на одном порту.
  const dist = path.resolve(__dirname, '../dist')
  if (existsSyncSafe(dist)) {
    app.use(express.static(dist))
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  const store = await getStorage()
  app.listen(port, () => {
    console.log(
      `Мой день: сервер запущен на http://localhost:${port} (хранилище: ${store.kind})`,
    )
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
