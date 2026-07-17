// Minimal D1 + request/context mocks for unit-testing Worker logic without a real DB.
// resolver(sql, binds) -> { first?, all?, run? }; unspecified reads default to null / empty.

export function mockDb(resolver) {
  const db = {
    batched: [], // records statements handed to batch(), each { sql, binds }
    prepare(sql) {
      const stmt = {
        sql,
        binds: [],
        bind(...args) { stmt.binds = args; return stmt },
        async first() { return resolver(sql, stmt.binds).first ?? null },
        async all() { return resolver(sql, stmt.binds).all ?? { results: [] } },
        async run() { return resolver(sql, stmt.binds).run ?? { meta: { changes: 1 } } },
      }
      return stmt
    },
    async batch(stmts) {
      for (const s of stmts) db.batched.push({ sql: s.sql, binds: s.binds })
      return stmts.map(() => ({ meta: { changes: 1 } }))
    },
  }
  return db
}

export function mockContext({ db, secret = 'test-secret', cookie = null, method = 'GET', path = '/api/x', body = null }) {
  const headers = new Map()
  if (cookie) headers.set('Cookie', cookie)
  const url = `https://portal.dreamhome.design${path}`
  return {
    request: {
      url, method,
      headers: { get: (h) => headers.get(h) ?? null },
      async json() { if (body == null) throw new Error('no body'); return body },
    },
    env: { JWT_SECRET: secret, DB: db },
  }
}
