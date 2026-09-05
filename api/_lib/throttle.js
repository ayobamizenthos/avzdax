const crypto = require('crypto')

const { readAttempts, writeAttempts } = require('./store')

const MAX_FAILURES = 8
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000

const addressOf = (req) => {
  const address =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'

  return crypto.createHash('sha256').update(address).digest('hex').slice(0, 16)
}

const prune = (record, now) => {
  const entries = Object.entries(record || {}).filter(
    ([, entry]) => now - (entry.last || 0) < Math.max(WINDOW_MS, LOCK_MS)
  )
  return Object.fromEntries(entries)
}

async function lockRemaining(req) {
  const now = Date.now()
  const record = prune(await readAttempts(), now)
  const entry = record[addressOf(req)]

  if (!entry || !entry.lockedUntil || entry.lockedUntil <= now) return 0
  return Math.ceil((entry.lockedUntil - now) / 60000)
}

async function recordFailure(req) {
  const now = Date.now()
  const address = addressOf(req)
  const record = prune(await readAttempts(), now)
  const entry = record[address] || { count: 0, last: 0 }

  const withinWindow = now - entry.last < WINDOW_MS
  const count = (withinWindow ? entry.count : 0) + 1

  record[address] = {
    count,
    last: now,
    lockedUntil: count >= MAX_FAILURES ? now + LOCK_MS : undefined
  }

  await writeAttempts(record)
  return MAX_FAILURES - count
}

async function clearFailures(req) {
  const now = Date.now()
  const record = prune(await readAttempts(), now)
  const address = addressOf(req)

  if (!record[address]) return
  delete record[address]
  await writeAttempts(record)
}

module.exports = { lockRemaining, recordFailure, clearFailures, MAX_FAILURES }
