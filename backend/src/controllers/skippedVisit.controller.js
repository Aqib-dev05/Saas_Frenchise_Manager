const prisma = require('../lib/prisma')

const ORG = (req) => req.user.organizationId

const SKIP_SELECT = {
  id: true, reason: true, notes: true, skippedDate: true,
  isResolved: true, resolvedAt: true, createdAt: true,
  shop: { select: { id: true, name: true, ownerName: true, phone: true, type: true, city: true } },
  salesman: { select: { id: true, name: true } },
}

const SKIP_REASON_LABELS = {
  SHOP_CLOSED: 'Shop was closed',
  OWNER_UNAVAILABLE: 'Owner not available',
  PAYMENT_DISPUTE: 'Payment dispute',
  OTHER: 'Other reason',
}

// POST /api/skipped-visits
// Salesman marks a route shop as "couldn't visit today" with a reason.
// Upsert: only one skip per shop per salesman per calendar day — if they
// try to re-mark a shop they already skipped today (e.g. changed reason),
// the existing record is updated rather than duplicated.
const createSkip = async (req, res, next) => {
  try {
    const { shopId, routeId, reason, notes } = req.body
    if (!shopId || !reason) return res.status(400).json({ message: 'shopId and reason are required' })

    const VALID_REASONS = ['SHOP_CLOSED', 'OWNER_UNAVAILABLE', 'PAYMENT_DISPUTE', 'OTHER']
    if (!VALID_REASONS.includes(reason)) {
      return res.status(400).json({ message: `reason must be one of: ${VALID_REASONS.join(', ')}` })
    }

    const shop = await prisma.shop.findFirst({ where: { id: shopId, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)

    // One skip per shop per salesman per day — update if already exists
    const existing = await prisma.skippedVisit.findFirst({
      where: { shopId, salesmanId: req.user.userId, skippedDate: { gte: todayStart, lte: todayEnd } },
    })

    let skip
    if (existing) {
      skip = await prisma.skippedVisit.update({
        where: { id: existing.id },
        data: { reason, notes: notes || null, isResolved: false, resolvedAt: null },
        select: SKIP_SELECT,
      })
    } else {
      skip = await prisma.skippedVisit.create({
        data: {
          organizationId: ORG(req),
          shopId,
          salesmanId: req.user.userId,
          routeId: routeId || null,
          reason,
          notes: notes || null,
        },
        select: SKIP_SELECT,
      })
    }

    res.status(201).json(skip)
  } catch (err) { next(err) }
}

// GET /api/skipped-visits
// Admin: all org's skips (filterable by shopId, salesmanId, resolved, date range).
// Salesman: their own skips only (salesmanId forced to their userId).
const getSkips = async (req, res, next) => {
  try {
    const { shopId, salesmanId, resolved, from, to } = req.query
    const where = { organizationId: ORG(req) }

    if (req.user.role === 'SALESMAN') {
      where.salesmanId = req.user.userId
    } else if (salesmanId) {
      where.salesmanId = salesmanId
    }

    if (shopId) where.shopId = shopId
    if (resolved !== undefined) where.isResolved = resolved === 'true'
    if (from || to) {
      where.skippedDate = {}
      if (from) where.skippedDate.gte = new Date(from)
      if (to) { const e = new Date(to); e.setHours(23, 59, 59, 999); where.skippedDate.lte = e }
    }

    const skips = await prisma.skippedVisit.findMany({
      where,
      select: SKIP_SELECT,
      orderBy: { skippedDate: 'desc' },
      take: 500,
    })

    res.json(skips)
  } catch (err) { next(err) }
}

// PUT /api/skipped-visits/:id/resolve
// Admin (or the salesman who created it) marks a skip as resolved —
// meaning the shop was eventually visited, called, or otherwise actioned.
// Does NOT delete — the audit trail stays intact.
const resolveSkip = async (req, res, next) => {
  try {
    const where = { id: req.params.id, organizationId: ORG(req) }
    // Salesman can only resolve their own skips
    if (req.user.role === 'SALESMAN') where.salesmanId = req.user.userId

    const skip = await prisma.skippedVisit.findFirst({ where })
    if (!skip) return res.status(404).json({ message: 'Skip record not found' })

    const updated = await prisma.skippedVisit.update({
      where: { id: skip.id },
      data: { isResolved: true, resolvedAt: new Date() },
      select: SKIP_SELECT,
    })

    res.json(updated)
  } catch (err) { next(err) }
}

module.exports = { createSkip, getSkips, resolveSkip }
