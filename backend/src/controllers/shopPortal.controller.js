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


// Reconstructs a full chronological account ledger.
// Balance-affecting entries (ORDER_DEBIT and PAYMENT) mirror the exact rules
// in order.controller.js and payment.controller.js so the running total here
// always matches shop.balance in the DB.
// All other orders are shown as ORDER_INFO — visible history, no balance change.
const getLedger = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findUnique({ where: { id: SHOP_ID(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })

    const tracksBalance = ['CREDIT', 'WHOLESALE'].includes(shop.type)

    const [allOrders, payments] = await Promise.all([
      prisma.order.findMany({
        where: { shopId: shop.id },
        include: {
          items: { include: { product: { select: { name: true, unit: true } } } },
          delivery: { select: { deliveredAt: true } },
          invoice: { select: { invoiceNo: true, isPaid: true } },
        },
        orderBy: { orderDate: 'asc' },
      }),
      prisma.payment.findMany({
        where: { shopId: shop.id },
        orderBy: { receivedAt: 'asc' },
      }),
    ])

    const entries = []

    for (const o of allOrders) {
      const unpaid = Number(o.totalAmount) - Number(o.paidAmount)
      const isDelivered = o.status === 'DELIVERED'
      const isBalanceDebit = tracksBalance && isDelivered && unpaid > 0
      const date = isDelivered && o.delivery?.deliveredAt ? o.delivery.deliveredAt : o.orderDate

      entries.push({
        type: isBalanceDebit ? 'ORDER_DEBIT' : 'ORDER_INFO',
        date,
        orderId: o.id,
        orderNo: o.orderNo,
        orderStatus: o.status,
        invoiceNo: o.invoice?.invoiceNo || null,
        isPaid: o.invoice?.isPaid || false,
        itemsSummary: o.items.map(i => `${i.product?.name} ×${i.quantity}`).join(', '),
        itemCount: o.items.length,
        description: isDelivered
          ? `Delivery received — ${o.orderNo}${o.invoice?.invoiceNo ? ' / ' + o.invoice.invoiceNo : ''}`
          : `Order ${o.orderNo} (${o.status.toLowerCase()})`,
        debit: isBalanceDebit ? unpaid : 0,
        credit: 0,
        totalAmount: Number(o.totalAmount),
      })
    }

    for (const p of payments) {
      const typeLabels = { CASH: 'Cash', CREDIT: 'Credit', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque' }
      entries.push({
        type: 'PAYMENT',
        date: p.receivedAt,
        paymentId: p.id,
        paymentType: p.type,
        paymentTypeLabel: typeLabels[p.type] || p.type,
        reference: p.reference || null,
        receivedBy: p.receivedBy || null,
        description: `Payment — ${typeLabels[p.type] || p.type}${p.reference ? ' / ' + p.reference : ''}`,
        debit: 0,
        credit: Number(p.amount),
        totalAmount: 0,
      })
    }

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))

    let running = 0
    const ledger = entries.map((e) => {
      if (e.type === 'ORDER_DEBIT' || e.type === 'PAYMENT') running += e.debit - e.credit
      return { ...e, runningBalance: running }
    })

    const deliveredOrders = allOrders.filter(o => o.status === 'DELIVERED')
    res.json({
      shop: { id: shop.id, name: shop.name, type: shop.type, balance: shop.balance, creditLimit: shop.creditLimit, tracksBalance },
      summary: {
        totalOrders: allOrders.length,
        deliveredOrders: deliveredOrders.length,
        totalBilled: deliveredOrders.reduce((s, o) => s + Number(o.totalAmount), 0),
        totalPaid: payments.reduce((s, p) => s + Number(p.amount), 0),
        currentBalance: Number(shop.balance),
      },
      entries: ledger,
    })
  } catch (err) { next(err) }
}

module.exports = { login, getMe, getOrders, getOrderById, getPayments, getLedger }
