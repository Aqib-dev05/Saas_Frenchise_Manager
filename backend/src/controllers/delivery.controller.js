const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const getDeliveries = async (req, res, next) => {
  try {
    const { status, date } = req.query
    const where = {}
    if (status) where.status = status
    if (req.user.role === 'DELIVERY') where.delivererId = req.user.userId
    if (date) {
      const d = new Date(date); const s = new Date(d); s.setHours(0,0,0,0); const e = new Date(d); e.setHours(23,59,59,999)
      where.createdAt = { gte: s, lte: e }
    }
    const deliveries = await prisma.delivery.findMany({
      where,
      include: { order: { include: { shop: true, items: { include: { product: true } }, salesman: { select: { id:true, name:true } } } }, deliverer: { select: { id:true, name:true } } },
      orderBy: { createdAt: 'desc' },
    })
    // Filter by org
    const filtered = deliveries.filter(d => d.order?.shop)
    res.json(filtered)
  } catch (err) { next(err) }
}

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body
    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: { status, notes: notes||undefined, deliveredAt: status==='DELIVERED' ? new Date() : undefined },
      include: { order: { include: { shop: true } } },
    })
    if (status === 'DELIVERED') {
      await prisma.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED' } })
      const order = delivery.order
      if (['CREDIT','WHOLESALE'].includes(order.shop.type)) {
        const unpaid = Number(order.totalAmount) - Number(order.paidAmount)
        if (unpaid > 0) await prisma.shop.update({ where: { id: order.shopId }, data: { balance: { increment: unpaid } } })
      }
    }
    res.json(delivery)
  } catch (err) { next(err) }
}

module.exports = { getDeliveries, updateDeliveryStatus }
