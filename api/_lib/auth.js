const crypto = require('crypto')

const COOKIE_NAME = 'avzdax_newsroom'
const SESSION_HOURS = 12

const signingKey = () => {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!secret) throw new Error('ADMIN_PASSWORD is not configured')
  return crypto.createHash('sha256').update('avzdax-newsroom:' + secret).digest()
}

const sign = (value) => crypto.createHmac('sha256', signingKey()).update(value).digest('base64url')

const digest = (value) => crypto.createHash('sha256').update(String(value)).digest()

function passwordMatches(candidate) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return crypto.timingSafeEqual(digest(candidate), digest(expected))
}

function issueSession() {
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const payload = String(expiresAt)
  return `${payload}.${sign(payload)}`
}

function sessionIsValid(token) {
  if (typeof token !== 'string') return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false

  let expected
  try {
    expected = Buffer.from(sign(payload))
  } catch {
    return false
  }

  const provided = Buffer.from(signature)
  if (expected.length !== provided.length) return false
  if (!crypto.timingSafeEqual(expected, provided)) return false

  return Number(payload) > Date.now()
}

function readCookie(req, name) {
  const header = req.headers.cookie
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

const cookieHeader = (value, maxAgeSeconds) =>
  [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ].join('; ')

const setSessionCookie = (res, token) =>
  res.setHeader('Set-Cookie', cookieHeader(token, SESSION_HOURS * 60 * 60))

const clearSessionCookie = (res) => res.setHeader('Set-Cookie', cookieHeader('', 0))

const isAuthenticated = (req) => sessionIsValid(readCookie(req, COOKIE_NAME))

function requireSession(req, res) {
  if (isAuthenticated(req)) return true
  res.status(401).json({ error: 'Not signed in' })
  return false
}

module.exports = {
  passwordMatches,
  issueSession,
  setSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  requireSession
}
