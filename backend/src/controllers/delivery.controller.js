const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

// Same lean projections used by order.controller.js — the delivery dashboard
// renders the same shop/product fields, no reason to ship full rows here either.
const DELIVERY_SHOP_SELECT = {
  id: true, name: true, ownerName: true, phone: true, address: true, city: true,
  latitude: true, longitude: true, type: true, balance: true, ownerPhoto: true,
}
const DELIVERY_ORDER_SELECT = {
  id: true, orderNo: true, status: true, totalAmount: true, paidAmount: true, orderDate: true,
  shop: { select: DELIVERY_SHOP_SELECT },
  items: { select: { id: true, quantity: true, price: true, subtotal: true, product: { select: { id: true, name: true, unit: true } } } },
  invoice: { select: { id: true, invoiceNo: true } },
}
const PERSON_SELECT = { id: true, name: true }

const getDeliveries = async (req, res, next) => {
  try {
    const { status, date } = req.query
    // NOTE: this previously had no organizationId scoping at all — it relied on
    // an in-memory `.filter(d => d.order?.shop)` which doesn't actually check
    // tenant ownership. Fixed to filter at the query level via the order relation.
    const where = { order: { organizationId: ORG(req) } }
    if (status) where.status = status
    if (req.user.role === 'DELIVERY') where.delivererId = req.user.userId
    if (date) {
      const d = new Date(date); const s = new Date(d); s.setHours(0,0,0,0); const e = new Date(d); e.setHours(23,59,59,999)
      where.createdAt = { gte: s, lte: e }
    }
    const deliveries = await prisma.delivery.findMany({
      where,
      select: {
        id: true, orderId: true, status: true, deliveredAt: true, notes: true, createdAt: true,
        order: { select: { ...DELIVERY_ORDER_SELECT, salesman: { select: PERSON_SELECT } } },
        deliverer: { select: PERSON_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(deliveries)
  } catch (err) { next(err) }
}

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body
    // Verify the delivery belongs to this organization before mutating it
    const existing = await prisma.delivery.findFirst({ where: { id: req.params.id, order: { organizationId: ORG(req) } } })
    if (!existing) return res.status(404).json({ message: 'Delivery not found' })

    const delivery = await prisma.delivery.update({
      where: { id: req.params.id },
      data: { status, notes: notes||undefined, deliveredAt: status==='DELIVERED' ? new Date() : undefined },
      select: { id: true, status: true, deliveredAt: true, notes: true, order: { select: { id: true, shopId: true, totalAmount: true, paidAmount: true, shop: { select: { id: true, type: true } } } } },
    })
    if (status === 'DELIVERED') {
      await prisma.order.update({ where: { id: delivery.order.id }, data: { status: 'DELIVERED' } })
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
