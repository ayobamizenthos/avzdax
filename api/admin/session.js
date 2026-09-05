const { isAuthenticated } = require('../_lib/auth')
const { storageConfigured } = require('../_lib/store')

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    signedIn: isAuthenticated(req),
    configured: Boolean(process.env.ADMIN_PASSWORD),
    storageReady: storageConfigured()
  })
}
