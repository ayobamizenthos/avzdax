const { passwordMatches, issueSession, setSessionCookie } = require('../_lib/auth')
const { storageConfigured } = require('../_lib/store')
const { lockRemaining, recordFailure, clearFailures } = require('../_lib/throttle')

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const password = (req.body || {}).password

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Enter your password' })
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is not configured')
    return res.status(500).json({ error: 'Sign-in is not configured yet' })
  }

  // Attempts are only counted when there is somewhere to count them. Without storage the
  // delay below is the only brake, which is why the throttle is worth having.
  const throttled = storageConfigured()

  if (throttled) {
    const minutes = await lockRemaining(req)
    if (minutes > 0) {
      return res.status(429).json({
        error: `Too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
      })
    }
  }

  if (!passwordMatches(password)) {
    await pause(600)

    if (!throttled) return res.status(401).json({ error: 'That password is not right' })

    const left = await recordFailure(req)

    return res.status(401).json({
      error: left > 0
        ? `That password is not right. ${left} attempt${left === 1 ? '' : 's'} left.`
        : 'Too many wrong attempts. Try again in 15 minutes.'
    })
  }

  if (throttled) await clearFailures(req)

  setSessionCookie(res, issueSession())
  return res.status(200).json({ ok: true })
}
