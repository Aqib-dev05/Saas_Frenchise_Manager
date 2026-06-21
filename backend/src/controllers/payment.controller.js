const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const getPayments = async (req, res, next) => {
  try {
    const { shopId, startDate, endDate, page=1, limit=20 } = req.query
    const where = { organizationId: ORG(req) }
    if (shopId) where.shopId = shopId
    if (startDate || endDate) {
      where.receivedAt = {}
      if (startDate) where.receivedAt.gte = new Date(startDate)
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.receivedAt.lte = e }
    }
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, include: { shop: { select: { id:true, name:true, ownerName:true, type:true } } }, orderBy: { receivedAt: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
      prisma.payment.count({ where }),
    ])
    res.json({ payments, total })
  } catch (err) { next(err) }
}

const createPayment = async (req, res, next) => {
  try {
    const { shopId, amount, type, reference, notes } = req.body
    if (!shopId || !amount) return res.status(400).json({ message: 'Shop and amount required' })
    const shop = await prisma.shop.findFirst({ where: { id: shopId, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    const amt = Number(amount)
    const payment = await prisma.payment.create({ data: { organizationId: ORG(req), shopId, amount: amt, type: type||'CASH', reference: reference||null, notes: notes||null, receivedBy: req.user.userId }, include: { shop: { select: { id:true, name:true } } } })
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
    res.status(201).json(payment)
  } catch (err) { next(err) }
}

const getShopPayments = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    const payments = await prisma.payment.findMany({ where: { shopId: req.params.id }, orderBy: { receivedAt: 'desc' } })
    res.json(payments)
  } catch (err) { next(err) }
}

module.exports = { getPayments, createPayment, getShopPayments }
