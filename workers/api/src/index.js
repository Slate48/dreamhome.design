/**
 * wl-dreamhome-api — public marketing-site API (base44→CF migration, public phase).
 *
 * Read-only GET endpoints for the PUBLIC content entities + a POST for the /contact
 * form (ContactInquiry). Backed by D1 `wl-dreamhome-db`. Portal/admin entities are
 * NOT served here (later migration phases). No auth (public content only).
 *
 * Response shape mirrors the base44 SDK: each GET returns a JSON array of records;
 * booleans are re-hydrated to true/false and JSON columns (payment_methods) parsed,
 * so the existing React pages need no shape changes — only their data source swaps.
 */

const PUBLIC_ENTITIES = {
  PortfolioItem: { bools: ['featured'], json: [], defaultSort: 'sort_order' },
  TeamMember:    { bools: ['show_title', 'is_founder'], json: [], defaultSort: 'sort_order' },
  FAQItem:       { bools: ['is_active'], json: [], defaultSort: 'sort_order' },
  ProcessStage:  { bools: ['is_active'], json: [], defaultSort: 'stage_number' },
  InvestmentTier:{ bools: [], json: ['payment_methods'], defaultSort: 'step_number' },
  Testimonial:   { bools: ['featured'], json: [], defaultSort: 'created_date' },
  SiteSettings:  { bools: [], json: [], defaultSort: 'key' },
}

// Columns allowed as sort / filter targets, per entity — prevents SQL injection via
// the sort/filter query params (identifiers can't be bound as parameters).
const SORTABLE = {
  PortfolioItem: ['sort_order', 'title', 'category', 'featured', 'created_date'],
  TeamMember: ['sort_order', 'name', 'department', 'is_founder', 'created_date'],
  FAQItem: ['sort_order', 'is_active', 'created_date'],
  ProcessStage: ['stage_number', 'is_active', 'created_date'],
  InvestmentTier: ['step_number', 'created_date'],
  Testimonial: ['created_date', 'rating', 'featured'],
  SiteSettings: ['key'],
}
const FILTERABLE = {
  PortfolioItem: ['category', 'featured'],
  TeamMember: ['department', 'is_founder'],
  FAQItem: ['is_active'],
  ProcessStage: ['is_active', 'stage_number'],
  InvestmentTier: ['step_number'],
  Testimonial: ['featured', 'project_type'],
  SiteSettings: ['key'],
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

function hydrate(row, meta) {
  if (!row) return row
  const out = { ...row }
  for (const b of meta.bools) if (b in out) out[b] = !!out[b]
  for (const j of meta.json) {
    if (typeof out[j] === 'string' && out[j]) {
      try { out[j] = JSON.parse(out[j]) } catch { /* leave as-is */ }
    }
  }
  return out
}

function newId() {
  // base44-style opaque id; crypto.randomUUID hyphens stripped is fine for our rows.
  return (crypto.randomUUID && crypto.randomUUID().replace(/-/g, '')) ||
    Math.random().toString(16).slice(2) + Date.now().toString(16)
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const { pathname, searchParams } = url

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    if (pathname === '/' || pathname === '/api/health') {
      return json({ ok: true, service: 'wl-dreamhome-api', entities: Object.keys(PUBLIC_ENTITIES) })
    }

    // /api/<Entity>
    const m = pathname.match(/^\/api\/([A-Za-z]+)$/)
    if (!m) return json({ error: 'not found' }, 404)
    const entity = m[1]
    const meta = PUBLIC_ENTITIES[entity]
    if (!meta) return json({ error: `unknown or non-public entity: ${entity}` }, 404)

    // POST — only ContactInquiry accepts writes.
    if (request.method === 'POST') {
      if (entity !== 'ContactInquiry') return json({ error: 'read-only entity' }, 405)
      let b
      try { b = await request.json() } catch { return json({ error: 'invalid JSON' }, 400) }
      if (!b || !b.name || !b.email || !b.message) {
        return json({ error: 'name, email, and message are required' }, 400)
      }
      const id = newId()
      const now = new Date().toISOString()
      await env.DB.prepare(
        `INSERT INTO ContactInquiry (id,name,email,phone,project_type,how_heard,message,status,created_date,updated_date)
         VALUES (?,?,?,?,?,?,?,?,?,?)`
      ).bind(id, b.name, b.email, b.phone || null, b.project_type || null, b.how_heard || null,
             b.message, 'New', now, now).run()
      return json({ id, name: b.name, email: b.email, status: 'New', created_date: now }, 201)
    }

    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405)

    // GET list with optional filter + sort (mirrors base44 .list/.filter semantics).
    const clauses = []
    const binds = []
    for (const [k, v] of searchParams.entries()) {
      if (['sort', 'limit', 'order'].includes(k)) continue
      if (!(FILTERABLE[entity] || []).includes(k)) continue
      // Coerce common boolean filter values to 0/1 for INTEGER columns.
      let val = v
      if (v === 'true') val = 1
      else if (v === 'false') val = 0
      clauses.push(`${k} = ?`)
      binds.push(val)
    }
    let sort = searchParams.get('sort') || meta.defaultSort
    if (!(SORTABLE[entity] || []).includes(sort)) sort = meta.defaultSort
    const order = (searchParams.get('order') || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC'
    let limit = parseInt(searchParams.get('limit') || '500', 10)
    if (!Number.isFinite(limit) || limit <= 0 || limit > 2000) limit = 500

    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''
    const sql = `SELECT * FROM ${entity}${where} ORDER BY ${sort} ${order} LIMIT ${limit}`
    const rs = await env.DB.prepare(sql).bind(...binds).all()
    const rows = (rs.results || []).map(r => hydrate(r, meta))
    return json(rows)
  },
}
