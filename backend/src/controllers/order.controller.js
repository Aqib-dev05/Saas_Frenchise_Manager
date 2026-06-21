const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const makeOrderNo = () => `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`
const makeInvoiceNo = () => `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`

const getOrders = async (req, res, next) => {
  try {
    const { status, date, shopId, page=1, limit=20 } = req.query
    const where = { organizationId: ORG(req) }
    if (status) where.status = status
    if (shopId) where.shopId = shopId
    if (req.user.role === 'SALESMAN') where.salesmanId = req.user.userId
    if (date) {
      const d = new Date(date); const start = new Date(d); start.setHours(0,0,0,0); const end = new Date(d); end.setHours(23,59,59,999)
      where.orderDate = { gte: start, lte: end }
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { shop: { select: { id:true, name:true, type:true, address:true } }, salesman: { select: { id:true, name:true } }, items: { include: { product: { select: { id:true, name:true, unit:true } } } }, invoice:true, delivery:true }, orderBy: { createdAt: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
      prisma.order.count({ where }),
    ])
    res.json({ orders, total })
  } catch (err) { next(err) }
}

const getTodayOrders = async (req, res, next) => {
  try {
    const start = new Date(); start.setHours(0,0,0,0); const end = new Date(); end.setHours(23,59,59,999)
    const where = { organizationId: ORG(req), orderDate: { gte: start, lte: end } }
    if (req.user.role === 'DELIVERY') where.status = { in: ['CONFIRMED','DISPATCHED'] }
    if (req.user.role === 'SALESMAN') where.salesmanId = req.user.userId
    const orders = await prisma.order.findMany({ where, include: { shop: true, salesman: { select: { id:true, name:true } }, items: { include: { product: true } }, delivery: true, invoice: true }, orderBy: { createdAt: 'asc' } })
    res.json(orders)
  } catch (err) { next(err) }
}

const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, organizationId: ORG(req) }, include: { shop: true, salesman: { select: { id:true, name:true } }, items: { include: { product: true } }, delivery: { include: { deliverer: { select: { id:true, name:true } } } }, invoice: true } })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) { next(err) }
}

const createOrder = async (req, res, next) => {
  try {
    const { shopId, routeId, items, notes } = req.body
    if (!shopId || !items?.length) return res.status(400).json({ message: 'Shop and items required' })
    const shop = await prisma.shop.findFirst({ where: { id: shopId, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })

    let totalAmount = 0
    const orderItems = []
    for (const item of items) {
      const product = await prisma.product.findFirst({ where: { id: item.productId, organizationId: ORG(req), isActive: true } })
      if (!product) return res.status(400).json({ message: `Product not found: ${item.productId}` })
      const subtotal = Number(product.price) * Number(item.quantity)
      totalAmount += subtotal
      orderItems.push({ productId: item.productId, quantity: Number(item.quantity), price: Number(product.price), subtotal })
    }

    const order = await prisma.order.create({
      data: { organizationId: ORG(req), orderNo: makeOrderNo(), shopId, salesmanId: req.user.userId, routeId: routeId||null, totalAmount, notes: notes||null, items: { create: orderItems } },
      include: { shop: true, salesman: { select: { id:true, name:true } }, items: { include: { product: true } } },
    })
    res.status(201).json(order)
  } catch (err) { next(err) }
}

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params; const { status, notes, delivererId } = req.body
    const order = await prisma.order.findFirst({ where: { id, organizationId: ORG(req) }, include: { items: true, shop: true } })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const updates = { status }; if (notes) updates.notes = notes

    if (status === 'CONFIRMED') {
      for (const item of order.items) await prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })
      const existing = await prisma.invoice.findUnique({ where: { orderId: id } })
      if (!existing) await prisma.invoice.create({ data: { invoiceNo: makeInvoiceNo(), orderId: id, amount: order.totalAmount, dueDate: new Date(Date.now() + 30*24*60*60*1000) } })
    }

    if (status === 'DISPATCHED') {
      const dId = delivererId || req.user.userId
      const ex = await prisma.delivery.findUnique({ where: { orderId: id } })
      if (!ex) await prisma.delivery.create({ data: { orderId: id, delivererId: dId, status: 'IN_TRANSIT' } })
      else await prisma.delivery.update({ where: { orderId: id }, data: { delivererId: dId, status: 'IN_TRANSIT' } })
    }

    if (status === 'DELIVERED') {
      await prisma.delivery.updateMany({ where: { orderId: id }, data: { status: 'DELIVERED', deliveredAt: new Date() } })
      if (['CREDIT','WHOLESALE'].includes(order.shop.type)) {
        const unpaid = Number(order.totalAmount) - Number(order.paidAmount)
        if (unpaid > 0) await prisma.shop.update({ where: { id: order.shopId }, data: { balance: { increment: unpaid } } })
      } else {
        await prisma.invoice.updateMany({ where: { orderId: id }, data: { paid: order.totalAmount, isPaid: true } })
        updates.paidAmount = order.totalAmount
      }
    }

    if (status === 'CANCELLED' && ['CONFIRMED','DISPATCHED'].includes(order.status)) {
      for (const item of order.items) await prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
      await prisma.delivery.updateMany({ where: { orderId: id }, data: { status: 'FAILED' } })
    }

    const updated = await prisma.order.update({ where: { id }, data: updates, include: { shop: true, items: { include: { product: true } }, delivery: true, invoice: true } })
    res.json(updated)
  } catch (err) { next(err) }
}

const updateOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.status !== 'PENDING') return res.status(400).json({ message: 'Only pending orders can be edited' })
    const { items, notes } = req.body
    let totalAmount = 0; const orderItems = []
    for (const item of items) {
      const p = await prisma.product.findFirst({ where: { id: item.productId, organizationId: ORG(req) } })
      if (!p) return res.status(400).json({ message: 'Product not found' })
      const subtotal = Number(p.price) * Number(item.quantity)
      totalAmount += subtotal
      orderItems.push({ productId: item.productId, quantity: Number(item.quantity), price: Number(p.price), subtotal })
    }
    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } })
    const updated = await prisma.order.update({ where: { id: req.params.id }, data: { totalAmount, notes: notes||null, items: { create: orderItems } }, include: { shop: true, items: { include: { product: true } } } })
    res.json(updated)
  } catch (err) { next(err) }
}

module.exports = { getOrders, getTodayOrders, getOrderById, createOrder, updateOrderStatus, updateOrder }
