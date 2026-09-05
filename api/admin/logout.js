const { clearSessionCookie } = require('../_lib/auth')

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
