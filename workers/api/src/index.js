/**
 * wl-dreamhome-api — Dream Home Design marketing site + portal/admin API
 * (base44→CF migration). Backed by D1 `wl-dreamhome-db` + R2 `wl-dreamhome-media`.
 *
 * Public phase (unchanged): GET on the 7 CMS content entities + POST on
 * ContactInquiry (the /contact form) stay unauthenticated — the live
 * marketing site depends on both.
 *
 * Portal/admin phase (this file): cookie+JWT auth (PBKDF2-HMAC-SHA-256 +
 * HS256, both via Web Crypto — no extra npm deps) gates staff CRUD on the 7
 * CMS entities, the ContactInquiry staff inbox (GET), and authenticated file
 * uploads to R2. Response shape mirrors the base44 SDK: GET list returns a
 * JSON array; booleans are hydrated to true/false and JSON columns parsed.
 */

import { json, parseJson, nowIso, newId, CORS } from './lib/http.js'
import { verifyPassword, signJwt, buildSessionCookie, clearSessionCookie, requireCapability, requireAuth, getSession, REMEMBER_MAX_AGE_S } from './lib/auth.js'
import { ENTITIES, CMS_ENTITIES, getEntity, hydrate, dehydrate } from './lib/entities.js'
import { ENTITY_CAPABILITY } from './lib/rbac.js'
import { handleAdminRoutes } from './lib/admin.js'

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // 20MB
const ALLOWED_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/quicktime',
])

function safeName(name) {
  return (name || 'file').toLowerCase().replace(/[^a-z0-9.\-_]/g, '-').slice(-100)
}

async function handleUpload(request, env) {
  if (!env.MEDIA_BUCKET) {
    return json({ error: 'R2 bucket is not configured (missing MEDIA_BUCKET binding)' }, 500)
  }

  let form
  try {
    form = await request.formData()
  } catch (e) {
    return json({ error: "Expected multipart/form-data with a 'file' field" }, 400)
  }

  const file = form.get('file')
  if (!file || typeof file === 'string') {
    return json({ error: 'No file provided' }, 400)
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: `File too large (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)` }, 413)
  }

  const type = file.type || 'application/octet-stream'
  if (!ALLOWED_UPLOAD_TYPES.has(type)) {
    return json({ error: `File type not allowed: ${type}` }, 415)
  }

  const key = `${crypto.randomUUID()}-${safeName(file.name)}`
  await env.MEDIA_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: type },
  })

  const base = (env.MEDIA_BASE_URL || '').replace(/\/+$/, '')
  const file_url = base ? `${base}/${key}` : `/media/${key}`

  return json({ file_url, key, type, size: file.size })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname, searchParams } = url
    const method = request.method
    const context = { request, env }

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (pathname === '/' || pathname === '/api/health') {
      return json({ ok: true, service: 'wl-dreamhome-api', entities: Object.keys(ENTITIES) })
    }

    // ---- auth routes ----

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJson(request)
      const email = (body.email || '').trim().toLowerCase()
      const password = body.password || ''
      if (!email || !password) {
        return json({ error: 'Email and password are required' }, 400)
      }
      if (!env.JWT_SECRET) {
        return json({ error: 'Server auth is not configured (missing JWT_SECRET)' }, 500)
      }

      const user = await env.DB
        .prepare('SELECT id, email, password_hash, role, full_name FROM users WHERE email = ?')
        .bind(email)
        .first()

      // Always run the password check (even against a null/dummy hash) so a
      // missing account doesn't respond faster than a wrong password.
      const ok = await verifyPassword(password, user ? user.password_hash : null)
      if (!user || !ok) {
        return json({ error: 'Invalid email or password' }, 401)
      }

      // "Remember me" = trusted device: persistent 30-day cookie + matching JWT TTL.
      // Otherwise a session cookie (dies on browser close) with the default 1-day TTL;
      // the frontend idle-logout hook signs non-persistent sessions out after inactivity.
      const remember = body.remember === true
      const token = await signJwt(
        { sub: user.id, email: user.email, role: user.role, rmb: remember },
        env.JWT_SECRET,
        remember ? REMEMBER_MAX_AGE_S : undefined
      )
      return json(
        { success: true, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } },
        200,
        { 'Set-Cookie': buildSessionCookie(token, { persistent: remember }) }
      )
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = await getSession(context)
      if (!user) return json({ error: 'Not authenticated' }, 401)
      return json({ id: user.id, email: user.email, role: user.role, full_name: user.full_name, persistent: user.persistent === true })
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() })
    }

    // ---- admin/user/tier management + invite acceptance + change-password ----
    const adminResp = await handleAdminRoutes(context)
    if (adminResp) return adminResp

    // ---- upload (any authenticated user) ----

    if (pathname === '/api/upload' && method === 'POST') {
      const auth = await requireAuth(context)
      if (auth.response) return auth.response
      return handleUpload(request, env)
    }

    // ---- entity item routes: /api/<Entity>/<id> (PATCH, DELETE) ----

    const itemMatch = pathname.match(/^\/api\/([A-Za-z]+)\/([A-Za-z0-9_-]+)$/)
    if (itemMatch) {
      const [, entityName, id] = itemMatch
      if (!CMS_ENTITIES.includes(entityName)) return json({ error: 'not found' }, 404)
      const config = getEntity(entityName)

      if (method === 'PATCH') {
        const auth = await requireCapability(context, ENTITY_CAPABILITY[entityName])
        if (auth.response) return auth.response

        const body = await parseJson(request)
        const values = dehydrate(config, body)
        if (Object.keys(values).length === 0) {
          return json({ error: 'No writable fields provided' }, 400)
        }
        const setClauses = Object.keys(values).map((col) => `${col} = ?`)
        setClauses.push('updated_date = ?')
        const bindValues = [...Object.values(values), nowIso(), id]

        const result = await env.DB
          .prepare(`UPDATE ${entityName} SET ${setClauses.join(', ')} WHERE id = ?`)
          .bind(...bindValues)
          .run()
        if (!result.meta || result.meta.changes === 0) {
          return json({ error: 'not found' }, 404)
        }
        const row = await env.DB.prepare(`SELECT * FROM ${entityName} WHERE id = ?`).bind(id).first()
        return json(hydrate(config, row))
      }

      if (method === 'DELETE') {
        const auth = await requireCapability(context, ENTITY_CAPABILITY[entityName])
        if (auth.response) return auth.response

        const result = await env.DB.prepare(`DELETE FROM ${entityName} WHERE id = ?`).bind(id).run()
        if (!result.meta || result.meta.changes === 0) {
          return json({ error: 'not found' }, 404)
        }
        return json({ success: true })
      }

      return json({ error: 'method not allowed' }, 405)
    }

    // ---- entity collection routes: /api/<Entity> (GET, POST) ----

    const m = pathname.match(/^\/api\/([A-Za-z]+)$/)
    if (!m) return json({ error: 'not found' }, 404)
    const entity = m[1]
    const meta = getEntity(entity)
    if (!meta) return json({ error: `unknown entity: ${entity}` }, 404)

    if (method === 'POST') {
      // ContactInquiry keeps its own public, unauthenticated create path —
      // the live /contact form depends on this staying open.
      if (entity === 'ContactInquiry') {
        let b
        try { b = await request.json() } catch { return json({ error: 'invalid JSON' }, 400) }
        if (!b || !b.name || !b.email || !b.message) {
          return json({ error: 'name, email, and message are required' }, 400)
        }
        const id = newId()
        const now = nowIso()
        await env.DB.prepare(
          `INSERT INTO ContactInquiry (id,name,email,phone,project_type,how_heard,message,status,created_date,updated_date)
           VALUES (?,?,?,?,?,?,?,?,?,?)`
        ).bind(id, b.name, b.email, b.phone || null, b.project_type || null, b.how_heard || null,
               b.message, 'New', now, now).run()
        return json({ id, name: b.name, email: b.email, status: 'New', created_date: now }, 201)
      }

      // Generic staff-gated create for the 7 CMS entities.
      if (!CMS_ENTITIES.includes(entity)) return json({ error: 'read-only entity' }, 405)
      const auth = await requireCapability(context, ENTITY_CAPABILITY[entity])
      if (auth.response) return auth.response

      const body = await parseJson(request)
      for (const field of meta.required) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
          return json({ error: `Missing required field: ${field}` }, 400)
        }
      }
      const values = dehydrate(meta, body)
      const id = newId()
      const now = nowIso()
      const columns = ['id', ...Object.keys(values), 'created_date', 'updated_date']
      const placeholders = columns.map(() => '?').join(', ')
      const bindValues = [id, ...Object.values(values), now, now]

      await env.DB
        .prepare(`INSERT INTO ${entity} (${columns.join(', ')}) VALUES (${placeholders})`)
        .bind(...bindValues)
        .run()
      const row = await env.DB.prepare(`SELECT * FROM ${entity} WHERE id = ?`).bind(id).first()
      return json(hydrate(meta, row), 201)
    }

    if (method !== 'GET') return json({ error: 'method not allowed' }, 405)

    // Staff-only entities (currently just ContactInquiry) require a role.
    if (!meta.publicRead) {
      const auth = await requireCapability(context, 'inquiries')
      if (auth.response) return auth.response
    }

    // GET list with optional filter + sort (mirrors base44 .list/.filter semantics).
    const clauses = []
    const binds = []
    for (const [k, v] of searchParams.entries()) {
      if (['sort', 'limit', 'order'].includes(k)) continue
      if (!(meta.filterable || []).includes(k)) continue
      // Coerce common boolean filter values to 0/1 for INTEGER columns.
      let val = v
      if (v === 'true') val = 1
      else if (v === 'false') val = 0
      clauses.push(`${k} = ?`)
      binds.push(val)
    }
    let sort = searchParams.get('sort') || meta.defaultSort
    if (!(meta.sortable || []).includes(sort)) sort = meta.defaultSort
    const order = (searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    let limit = parseInt(searchParams.get('limit') || '500', 10)
    if (!Number.isFinite(limit) || limit <= 0 || limit > 2000) limit = 500

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
    const sql = `SELECT * FROM ${entity}${where} ORDER BY ${sort} ${order} LIMIT ${limit}`
    const rs = await env.DB.prepare(sql).bind(...binds).all()
    const rows = (rs.results || []).map((r) => hydrate(meta, r))
    return json(rows)
  },
}
