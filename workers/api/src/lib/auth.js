// Cookie/JWT auth for wl-dreamhome-api (portal/admin CRUD + client uploads).
// Ported from echohouse-films' functions/api/_auth.js — same PBKDF2-HMAC-SHA-256
// password hashing + HS256 JWT via Web Crypto (SubtleCrypto), no extra npm deps.

import { json, readCookie } from './http.js'

export const COOKIE = 'dreamhome_session'
const PBKDF2_ITERATIONS = 100000
const KEY_LENGTH_BITS = 256 // 32 bytes

// "Remember me" = trusted device: a persistent cookie that survives browser restarts.
// Without it, the cookie is a session cookie (dies on browser close) and the frontend
// idle-logout hook signs the user out after inactivity. See docs/superpowers/specs.
export const REMEMBER_MAX_AGE_S = 30 * 24 * 60 * 60 // 30 days
const SESSION_JWT_TTL_S = 86400 // 1 day (session-cookie / non-remembered)

// ---- base64url helpers ----

function bytesToBase64Url(bytes) {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64url.length + 3) % 4)
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function textToBase64Url(str) {
  return bytesToBase64Url(new TextEncoder().encode(str))
}

function base64UrlToText(b64url) {
  return new TextDecoder().decode(base64UrlToBytes(b64url))
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  return bytes
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---- password hashing (PBKDF2-HMAC-SHA-256) ----

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const dk = await pbkdf2(password, salt)
  return `v1:${bytesToHex(salt)}:${bytesToHex(dk)}`
}

export async function verifyPassword(password, storedHash) {
  // Always run a PBKDF2 derivation even for a malformed/missing hash so
  // login timing doesn't leak whether the account exists.
  const dummySalt = new Uint8Array(16)
  let salt = dummySalt
  let expectedHex = ''
  if (typeof storedHash === 'string') {
    const parts = storedHash.split(':')
    if (parts.length === 3 && parts[0] === 'v1') {
      salt = hexToBytes(parts[1])
      expectedHex = parts[2]
    }
  }
  const dk = await pbkdf2(password, salt)
  const gotHex = bytesToHex(dk)
  return constantTimeEqual(gotHex, expectedHex || '0'.repeat(gotHex.length))
}

async function pbkdf2(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS
  )
  return new Uint8Array(bits)
}

// ---- JWT (HS256) ----

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export async function signJwt(payload, secret, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const fullPayload = { ...payload, iat, exp: iat + expiresInSeconds }
  const encodedHeader = textToBase64Url(JSON.stringify(header))
  const encodedPayload = textToBase64Url(JSON.stringify(fullPayload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput))
  const encodedSig = bytesToBase64Url(new Uint8Array(sig))
  return `${signingInput}.${encodedSig}`
}

export async function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [encodedHeader, encodedPayload, encodedSig] = parts
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const key = await hmacKey(secret)
  let sigBytes
  try {
    sigBytes = base64UrlToBytes(encodedSig)
  } catch (e) {
    return null
  }
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(signingInput))
  if (!valid) return null
  let payload
  try {
    payload = JSON.parse(base64UrlToText(encodedPayload))
  } catch (e) {
    return null
  }
  if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) >= payload.exp) return null
  return payload
}

// ---- cookie helpers ----

// persistent === true  -> long-lived cookie (survives browser restarts, ~30 days).
// persistent falsy      -> session cookie (no Max-Age/Expires -> cleared on browser close).
export function buildSessionCookie(token, { persistent = false } = {}) {
  const base = `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/`
  return persistent ? `${base}; Max-Age=${REMEMBER_MAX_AGE_S}` : base
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

// ---- session resolution ----
// context is a plain { request, env } pair (this Worker has no Pages Functions
// context object — we build the same shape manually in src/index.js).

export async function getSession(context) {
  const { request, env } = context
  const token = readCookie(request, COOKIE)
  if (!token) return null
  if (!env.JWT_SECRET) return null
  const payload = await verifyJwt(token, env.JWT_SECRET)
  if (!payload || !payload.sub) return null

  // Re-fetch the live row every time — never trust the JWT's stale role claim,
  // in case the user's role was changed (or the account removed) since login.
  const user = await env.DB
    .prepare('SELECT id, email, role, full_name FROM users WHERE id = ?')
    .bind(payload.sub)
    .first()
  if (!user) return null
  // `persistent` reflects the "remember me" claim on the session token; it drives the
  // frontend idle-logout (non-persistent sessions get signed out after inactivity).
  // It is NOT trusted for authorization — role is always the live D1 value above.
  return { ...user, persistent: payload.rmb === true }
}

export async function requireAuth(context) {
  const user = await getSession(context)
  if (!user) {
    return { response: json({ error: 'Authentication required' }, 401) }
  }
  return { user }
}

export async function requireRole(context, allowedRoles) {
  const result = await requireAuth(context)
  if (result.response) return result
  if (!allowedRoles.includes(result.user.role)) {
    return { response: json({ error: 'Insufficient privileges' }, 403) }
  }
  return result
}
