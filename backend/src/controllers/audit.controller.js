const prisma = require('../lib/prisma')

const ORG = (req) => req.user.organizationId

// Read-only by design — there is no update/delete here. An audit trail an
// admin can edit or clear isn't a trustworthy audit trail.
const getAuditLogs = async (req, res, next) => {
  try {
    const { resource, action, userId, from, to, q, page = 1, limit = 50 } = req.query
    const where = { organizationId: ORG(req) }
    if (resource) where.resource = resource
    if (action) where.action = action
    if (userId) where.userId = userId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) { const end = new Date(to); end.setHours(23, 59, 59, 999); where.createdAt.lte = end }
    }
    if (q) where.description = { contains: q, mode: 'insensitive' }

    const take = Math.min(Number(limit), 200)
    const skip = (Number(page) - 1) * take

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.auditLog.count({ where }),
    ])

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / take) })
  } catch (err) { next(err) }
}

// Populates the filter dropdowns with only the values actually present in
// this org's logs, rather than a hardcoded list that may not match reality.
const getAuditLogFilters = async (req, res, next) => {
  try {
    const orgId = ORG(req)
    const [resources, actions, users] = await Promise.all([
      prisma.auditLog.findMany({ where: { organizationId: orgId }, select: { resource: true }, distinct: ['resource'] }),
      prisma.auditLog.findMany({ where: { organizationId: orgId }, select: { action: true }, distinct: ['action'] }),
      prisma.auditLog.findMany({ where: { organizationId: orgId, userId: { not: null } }, select: { userId: true, userName: true }, distinct: ['userId'] }),
    ])
    res.json({
      resources: resources.map((r) => r.resource).sort(),
      actions: actions.map((a) => a.action).sort(),
      users: users.map((u) => ({ id: u.userId, name: u.userName || 'Unknown' })),
    })
  } catch (err) { next(err) }
}

module.exports = { getAuditLogs, getAuditLogFilters }
