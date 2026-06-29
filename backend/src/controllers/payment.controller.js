const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

// Excludes organizationId/shopId raw FK columns — every consumer reads the
// nested `shop` object instead. `receivedBy` is kept because attachReceiverInfo
// needs it to batch-resolve the user lookup below.
const PAYMENT_SELECT = {
  id: true, amount: true, type: true, reference: true, notes: true,
  receivedBy: true, receivedAt: true, createdAt: true,
}
const PAYMENT_SHOP_SELECT = { id: true, name: true, ownerName: true, type: true }

const attachReceiverInfo = async (payments) => {
  const ids = [...new Set(payments.map(p => p.receivedBy).filter(Boolean))]
  if (ids.length === 0) return payments
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } })
  const map = Object.fromEntries(users.map(u => [u.id, u]))
  return payments.map(p => ({ ...p, receivedByUser: map[p.receivedBy] || null }))
}

const getPayments = async (req, res, next) => {
  try {
    const { shopId, startDate, endDate, page = 1, limit = 20 } = req.query
    const where = { organizationId: ORG(req) }
    if (shopId) where.shopId = shopId
    if (req.user.role === 'DELIVERY') where.receivedBy = req.user.userId
    if (startDate || endDate) {
      where.receivedAt = {}
      if (startDate) where.receivedAt.gte = new Date(startDate)
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.receivedAt.lte = e }
    }
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, select: { ...PAYMENT_SELECT, shop: { select: PAYMENT_SHOP_SELECT } }, orderBy: { receivedAt: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
      prisma.payment.count({ where }),
    ])
    const withReceiver = await attachReceiverInfo(payments)
    res.json({ payments: withReceiver, total })
  } catch (err) { next(err) }
}

const createPayment = async (req, res, next) => {
  try {
    const { shopId, amount, type, reference, notes } = req.body
    if (!shopId || !amount) return res.status(400).json({ message: 'Shop and amount required' })
    const shop = await prisma.shop.findFirst({ where: { id: shopId, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    const amt = Number(amount)
    if (amt <= 0) return res.status(400).json({ message: 'Amount must be greater than 0' })

    const payment = await prisma.payment.create({
      data: { organizationId: ORG(req), shopId, amount: amt, type: type||'CASH', reference: reference||null, notes: notes||null, receivedBy: req.user.userId },
      select: { ...PAYMENT_SELECT, shop: { select: { id: true, name: true } } },
    })
    await prisma.shop.update({ where: { id: shopId }, data: { balance: { decrement: amt } } })

    const unpaidInvoices = await prisma.invoice.findMany({ where: { order: { shopId }, isPaid: false }, orderBy: { createdAt: 'asc' } })
    let rem = amt
    for (const inv of unpaidInvoices) {
      if (rem <= 0) break
      const outstanding = Number(inv.amount) - Number(inv.paid)
      const toApply = Math.min(rem, outstanding)
      await prisma.invoice.update({ where: { id: inv.id }, data: { paid: Number(inv.paid) + toApply, isPaid: (Number(inv.paid) + toApply) >= Number(inv.amount) } })
      rem -= toApply
    }

    const [withReceiver] = await attachReceiverInfo([payment])
    res.status(201).json(withReceiver)
  } catch (err) { next(err) }
}

const getShopPayments = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    const where = { shopId: req.params.id }
    if (req.user.role === 'DELIVERY') where.receivedBy = req.user.userId
    const payments = await prisma.payment.findMany({ where, select: PAYMENT_SELECT, orderBy: { receivedAt: 'desc' } })
    res.json(await attachReceiverInfo(payments))
  } catch (err) { next(err) }
}

module.exports = { getPayments, createPayment, getShopPayments }
