const jwt = require('jsonwebtoken')

const STAFF_ROLES = ['ADMIN', 'SALESMAN', 'DELIVERY']

const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' })
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)
    // Staff tokens always carry one of the three roles. Shop-portal tokens
    // deliberately don't (they carry shopId/type instead) — rejecting any
    // token without a staff role here means a shop-portal token can never
    // be replayed against a staff route that forgot to add authorize(...).
    if (!STAFF_ROLES.includes(decoded.role)) return res.status(401).json({ message: 'Invalid or expired token' })
    req.user = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' })
  next()
}

module.exports = { authenticate, authorize }
