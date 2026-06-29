const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

// Deliberately re-checks the DB on every request (unlike staff `authenticate`,
// which only verifies the JWT). A shop portal is handed to an external party
// outside the organization, so "disable portal access" needs to revoke
// already-issued tokens immediately, not just block future logins.
const authenticateShopPortal = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)
    if (decoded.type !== 'SHOP_PORTAL' || !decoded.shopId) {
      return res.status(401).json({ message: 'Invalid or expired token' })
    }
    const shop = await prisma.shop.findUnique({ where: { id: decoded.shopId } })
    if (!shop || !shop.portalEnabled || !shop.isActive) {
      return res.status(401).json({ message: 'Portal access has been disabled' })
    }
    req.shop = { shopId: shop.id, organizationId: shop.organizationId }
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = { authenticateShopPortal }
