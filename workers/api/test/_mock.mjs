// Minimal D1 + request/context mocks for unit-testing Worker logic without a real DB.
// resolver(sql, binds) -> { first?, all?, run? }; unspecified reads default to null / empty.

export function mockDb(resolver) {
  return {
    prepare(sql) {
      let binds = []
      const stmt = {
        bind(...args) { binds = args; return stmt },
        async first() { return resolver(sql, binds).first ?? null },
        async all() { return resolver(sql, binds).all ?? { results: [] } },
        async run() { return resolver(sql, binds).run ?? { meta: { changes: 1 } } },
      }
      return stmt
    },
    async batch(stmts) { return stmts.map(() => ({ meta: { changes: 1 } })) },
  }
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
