// Shared tiny helpers for wl-dreamhome-api routes. Kept dependency-free
// (Web Crypto / fetch APIs only) since this is a standalone Worker, not
// Pages Functions — no build step, no npm deps.

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
  })
}

export async function parseJson(request) {
  try { return await request.json() } catch { return {} }
}

export function nowIso() {
  return new Date().toISOString()
}

export function newId() {
  // base44-style opaque id; crypto.randomUUID hyphens stripped is fine for our rows.
  return (crypto.randomUUID && crypto.randomUUID().replace(/-/g, '')) ||
    Math.random().toString(16).slice(2) + Date.now().toString(16)
}

export function readCookie(request, name) {
  const header = request.headers.get('Cookie') || ''
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}
