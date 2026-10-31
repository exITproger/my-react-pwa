/**
 * Vercel Serverless Function (Node.js runtime).
 *
 * Разворачивается в папке /api на Vercel. Маршруты:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/sync
 *   PUT  /api/sync
 *
 * Данные хранятся в памяти инстанса (эфемерно). Для персистентного
 * хранения подключите внешнюю БД (Vercel KV / Upstash Redis / Turso):
 * замените createMemoryStorage() на createDbStorage() с драйвером БД.
 */
import { handleRequest } from '../server/index.js'

export default async function handler(req, res) {
  // CORS для разных доменов (если клиент и API на разных Vercel-проектах).
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization',
  )
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const handled = await handleRequest(req, res, req.url.split('?')[0])
  if (!handled) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Не найдено' }))
  }
}

// Увеличиваем лимит тела запроса до 4.5 MB (максимум Vercel для Hobby).
export const config = {
  maxDuration: 10,
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}
