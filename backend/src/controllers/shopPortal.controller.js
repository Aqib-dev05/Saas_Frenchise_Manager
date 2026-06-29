const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')

const SHOP_ID = (req) => req.shop.shopId

const SHOP_PROFILE_SELECT = {
  id: true, name: true, ownerName: true, phone: true, address: true, city: true,
  type: true, balance: true, creditLimit: true, ownerPhoto: true, portalLastLoginAt: true,
}

const login = async (req, res, next) => {
  try {
    const { code, password } = req.body
    if (!code || !password) return res.status(400).json({ message: 'Code and password are required' })

    const shop = await prisma.shop.findUnique({ where: { portalCode: code.trim().toUpperCase() } })
    // Same generic message whether the code doesn't exist, access was
    // disabled, or the password is wrong — doesn't help an attacker
    // distinguish "no such code" from "wrong password for a real shop".
    if (!shop || !shop.portalEnabled || !shop.isActive || !shop.portalPasswordHash) {
      return res.status(401).json({ message: 'Invalid code or password' })
    }
    const valid = await bcrypt.compare(password, shop.portalPasswordHash)
    if (!valid) return res.status(401).json({ message: 'Invalid code or password' })

    await prisma.shop.update({ where: { id: shop.id }, data: { portalLastLoginAt: new Date() } })

    const token = jwt.sign(
      { shopId: shop.id, organizationId: shop.organizationId, type: 'SHOP_PORTAL' },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    res.json({
      token,
      shop: { id: shop.id, name: shop.name, ownerName: shop.ownerName, type: shop.type, balance: shop.balance, creditLimit: shop.creditLimit },
    })
  } catch (err) { next(err) }
}

const getMe = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: SHOP_ID(req) }, select: SHOP_PROFILE_SELECT })
    res.json(shop)
  } catch (err) { next(err) }
}

const getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query
    const where = { shopId: SHOP_ID(req) }
    if (status) where.status = status
    const take = Math.min(Number(limit), 100)
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: { include: { product: { select: { name: true, unit: true } } } },
          invoice: { select: { id: true, invoiceNo: true, isPaid: true, paid: true, amount: true, dueDate: true } },
        },
        orderBy: { orderDate: 'desc' },
        skip: (Number(page) - 1) * take,
        take,
      }),
      prisma.order.count({ where }),
    ])
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / take) })
  } catch (err) { next(err) }
}

const getOrderById = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, shopId: SHOP_ID(req) },
      include: {
        items: { include: { product: { select: { name: true, unit: true, sku: true } } } },
        invoice: true, delivery: { select: { status: true, deliveredAt: true } },
      },
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json(order)
  } catch (err) { next(err) }
}

const getPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { shopId: SHOP_ID(req) },
      select: { id: true, amount: true, type: true, reference: true, receivedAt: true },
      orderBy: { receivedAt: 'desc' },
    })
    res.json(payments)
  } catch (err) { next(err) }
}

// Reconstructs a chronological, running-balance ledger from the same two
// events that actually move `shop.balance` in the live system (see
// order.controller.js#updateOrderStatus and payment.controller.js#createPayment):
//   - an order's balance debit only happens once, on DELIVERED, and only for
//     CREDIT/WHOLESALE shops, for the unpaid remainder at that moment
//   - every payment is a credit, for any shop type
// Mirroring those exact conditions keeps the ledger's running total in sync
// with the real `shop.balance` rather than drifting from it over time.
const getLedger = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: SHOP_ID(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })

    const tracksBalance = ['CREDIT', 'WHOLESALE'].includes(shop.type)

    const [deliveredOrders, payments] = await Promise.all([
      tracksBalance
        ? prisma.order.findMany({
            where: { shopId: shop.id, status: 'DELIVERED' },
            include: { delivery: { select: { deliveredAt: true } } },
            orderBy: { orderDate: 'asc' },
          })
        : [],
      prisma.payment.findMany({ where: { shopId: shop.id }, orderBy: { receivedAt: 'asc' } }),
    ])

    const entries = []
    for (const o of deliveredOrders) {
      const unpaid = Number(o.totalAmount) - Number(o.paidAmount)
      if (unpaid <= 0) continue
      entries.push({
        type: 'ORDER', date: o.delivery?.deliveredAt || o.updatedAt, orderId: o.id, orderNo: o.orderNo,
        description: `Order ${o.orderNo} delivered`, debit: unpaid, credit: 0,
      })
    }
    for (const p of payments) {
      entries.push({
        type: 'PAYMENT', date: p.receivedAt, paymentId: p.id,
        description: `Payment received${p.reference ? ` — ${p.reference}` : ''} (${p.type})`, debit: 0, credit: Number(p.amount),
      })
    }
    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    const ledger = entries.map((e) => { running += e.debit - e.credit; return { ...e, runningBalance: running } })

    res.json({
      shop: { id: shop.id, name: shop.name, type: shop.type, balance: shop.balance, creditLimit: shop.creditLimit, tracksBalance },
      entries: ledger,
    })
  } catch (err) { next(err) }
}

module.exports = { login, getMe, getOrders, getOrderById, getPayments, getLedger }
