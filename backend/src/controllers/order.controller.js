const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const makeOrderNo = () => `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`
const makeInvoiceNo = () => `INV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000+Math.random()*9000)}`

// Lean projections — only the fields each consuming screen actually renders.
// Keeping these tight matters here more than anywhere else in the API:
// getTodayOrders is polled every 30s by BOTH the salesman and delivery
// dashboards, so trimming it directly cuts recurring payload size/DB cost.
const ORDER_SHOP_SELECT = {
  id: true, name: true, ownerName: true, phone: true, address: true, city: true,
  latitude: true, longitude: true, type: true, balance: true, ownerPhoto: true,
}
const ORDER_ITEM_PRODUCT_SELECT = { id: true, name: true, unit: true }
const ORDER_ITEM_SELECT = { id: true, quantity: true, price: true, subtotal: true, product: { select: ORDER_ITEM_PRODUCT_SELECT } }
const SALESMAN_SELECT = { id: true, name: true }

// Base order fields shared by every list/detail response — deliberately
// excludes organizationId/shopId/salesmanId/routeId (raw FK columns) since
// every consumer reads the nested shop/salesman objects instead.
const ORDER_BASE_SELECT = {
  id: true, orderNo: true, status: true, totalAmount: true, paidAmount: true,
  notes: true, orderDate: true, createdAt: true, updatedAt: true,
}

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
      prisma.order.findMany({
        where,
        select: {
          ...ORDER_BASE_SELECT,
          shop: { select: ORDER_SHOP_SELECT },
          salesman: { select: SALESMAN_SELECT },
          items: { select: ORDER_ITEM_SELECT },
          invoice: true, // used by admin Invoices page
        },
        orderBy: { createdAt: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit),
      }),
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
    // Delivery status comes from a separate /deliveries fetch, so it's still
    // omitted here — but `invoice` (lean) is included so both dashboards can
    // offer an invoice-download action without an extra round trip.
    const orders = await prisma.order.findMany({
      where,
      select: {
        ...ORDER_BASE_SELECT,
        shop: { select: ORDER_SHOP_SELECT },
        salesman: { select: SALESMAN_SELECT },
        items: { select: ORDER_ITEM_SELECT },
        invoice: { select: { id: true, invoiceNo: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json(orders)
  } catch (err) { next(err) }
}

const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, organizationId: ORG(req) },
      select: {
        ...ORDER_BASE_SELECT,
        shop: { select: ORDER_SHOP_SELECT },
        salesman: { select: SALESMAN_SELECT },
        items: { select: ORDER_ITEM_SELECT },
        delivery: { select: { id: true, status: true, deliveredAt: true, notes: true, deliverer: { select: SALESMAN_SELECT } } },
        invoice: true,
      },
    })
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
      select: { ...ORDER_BASE_SELECT, shop: { select: ORDER_SHOP_SELECT }, items: { select: ORDER_ITEM_SELECT } },
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

    const updated = await prisma.order.update({
      where: { id },
      data: updates,
      select: { ...ORDER_BASE_SELECT, shop: { select: ORDER_SHOP_SELECT }, items: { select: ORDER_ITEM_SELECT }, delivery: true, invoice: true },
    })
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
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { totalAmount, notes: notes||null, items: { create: orderItems } },
      select: { ...ORDER_BASE_SELECT, shop: { select: ORDER_SHOP_SELECT }, items: { select: ORDER_ITEM_SELECT } },
    })
    res.json(updated)
  } catch (err) { next(err) }
}

module.exports = { getOrders, getTodayOrders, getOrderById, createOrder, updateOrderStatus, updateOrder }
