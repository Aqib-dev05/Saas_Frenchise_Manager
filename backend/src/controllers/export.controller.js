const ExcelJS = require('exceljs')
const prisma = require('../lib/prisma')

const ORG = (req) => req.user.organizationId

// Orders in these statuses represent committed sales — stock has already
// been decremented and an invoice exists. PENDING/CANCELLED are excluded
// from every revenue-bearing report below.
const SALE_STATUSES = ['CONFIRMED', 'DISPATCHED', 'DELIVERED']

const num = (v) => Number(v || 0)
const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0)

// Parses ?from=&to= into a Prisma date-range filter. Both are optional and
// independent — a report can be "everything up to X" or "everything since Y".
const dateRangeFilter = (req, { from, to } = {}) => {
  const f = from ?? req.query.from
  const t = to ?? req.query.to
  if (!f && !t) return undefined
  const range = {}
  if (f) range.gte = new Date(f)
  if (t) { const end = new Date(t); end.setHours(23, 59, 59, 999); range.lte = end }
  return range
}

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }

const buildSheet = (workbook, name, columns, rows) => {
  const sheet = workbook.addWorksheet(name)
  sheet.columns = columns
  rows.forEach((r) => sheet.addRow(r))
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = HEADER_FILL
  header.alignment = { vertical: 'middle' }
  header.height = 20
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  return sheet
}

// CSV export reuses the exact same worksheet (just dropped through ExcelJS's
// CSV writer instead of its XLSX writer) so every report has one row-building
// code path regardless of which format the admin picked.
const sendWorkbook = async (res, workbook, filenameBase, format) => {
  const isCsv = format === 'csv'
  if (isCsv) {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`)
    const buffer = await workbook.csv.writeBuffer()
    res.send(buffer)
  } else {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`)
    const buffer = await workbook.xlsx.writeBuffer()
    res.send(buffer)
  }
}

// ───────────── Products ─────────────

const exportProducts = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ where: { organizationId: ORG(req) }, orderBy: { name: 'asc' } })
    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Products', [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Price', key: 'price', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Cost Price', key: 'costPrice', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Margin %', key: 'marginPct', width: 12 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Min Stock', key: 'minStock', width: 10 },
      { header: 'Low Stock?', key: 'lowStock', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
    ], products.map((p) => {
      const price = num(p.price), cost = num(p.costPrice)
      return {
        sku: p.sku, name: p.name, category: p.category, unit: p.unit,
        price, costPrice: cost,
        marginPct: price > 0 ? Math.round(((price - cost) / price) * 1000) / 10 : 0,
        stock: p.stock, minStock: p.minStock,
        lowStock: p.stock <= p.minStock ? 'Yes' : 'No',
        status: p.isActive ? 'Active' : 'Inactive',
      }
    }))
    await sendWorkbook(res, workbook, 'products', req.query.format)
  } catch (err) { next(err) }
}

// ───────────── Users (never include password/OTP fields) ─────────────

const exportUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { organizationId: ORG(req) },
      select: { name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Users', [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Joined', key: 'joined', width: 14 },
    ], users.map((u) => ({
      name: u.name, email: u.email, role: u.role, phone: u.phone || '—',
      status: u.isActive ? 'Active' : 'Inactive',
      joined: u.createdAt.toISOString().slice(0, 10),
    })))
    await sendWorkbook(res, workbook, 'users', req.query.format)
  } catch (err) { next(err) }
}

// ───────────── Shops / Credit report ─────────────

const exportShops = async (req, res, next) => {
  try {
    const shops = await prisma.shop.findMany({ where: { organizationId: ORG(req) }, orderBy: { name: 'asc' } })
    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Shops', [
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Owner', key: 'ownerName', width: 22 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'City', key: 'city', width: 14 },
      { header: 'Address', key: 'address', width: 32 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Balance Due', key: 'balance', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Credit Limit', key: 'creditLimit', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Status', key: 'status', width: 10 },
    ], shops.map((s) => ({
      name: s.name, ownerName: s.ownerName, phone: s.phone, city: s.city, address: s.address,
      type: s.type, balance: num(s.balance), creditLimit: num(s.creditLimit),
      status: s.isActive ? 'Active' : 'Inactive',
    })))
    await sendWorkbook(res, workbook, 'shops', req.query.format)
  } catch (err) { next(err) }
}

const exportCreditReport = async (req, res, next) => {
  try {
    const shops = await prisma.shop.findMany({
      where: { organizationId: ORG(req), isActive: true, balance: { gt: 0 } },
      orderBy: { balance: 'desc' },
    })
    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Credit Report', [
      { header: 'Shop', key: 'name', width: 28 },
      { header: 'Owner', key: 'ownerName', width: 22 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Balance Due', key: 'balance', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Credit Limit', key: 'creditLimit', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Over Limit?', key: 'overLimit', width: 12 },
    ], shops.map((s) => ({
      name: s.name, ownerName: s.ownerName, phone: s.phone, type: s.type,
      balance: num(s.balance), creditLimit: num(s.creditLimit),
      overLimit: num(s.balance) > num(s.creditLimit) ? 'Yes' : 'No',
    })))
    await sendWorkbook(res, workbook, 'credit-report', req.query.format)
  } catch (err) { next(err) }
}

// ───────────── Payments ─────────────

const exportPayments = async (req, res, next) => {
  try {
    const where = { organizationId: ORG(req) }
    const receivedAt = dateRangeFilter(req)
    if (receivedAt) where.receivedAt = receivedAt

    const payments = await prisma.payment.findMany({
      where,
      include: { shop: { select: { name: true, type: true } } },
      orderBy: { receivedAt: 'desc' },
    })

    const receiverIds = [...new Set(payments.map((p) => p.receivedBy).filter(Boolean))]
    const receivers = receiverIds.length
      ? await prisma.user.findMany({ where: { id: { in: receiverIds } }, select: { id: true, name: true } })
      : []
    const receiverById = new Map(receivers.map((u) => [u.id, u.name]))

    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Payments', [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Shop', key: 'shop', width: 28 },
      { header: 'Amount', key: 'amount', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Reference', key: 'reference', width: 18 },
      { header: 'Received By', key: 'receivedByName', width: 20 },
      { header: 'Notes', key: 'notes', width: 30 },
    ], payments.map((p) => ({
      date: p.receivedAt.toISOString().slice(0, 10),
      shop: p.shop?.name || '—',
      amount: num(p.amount),
      type: p.type,
      reference: p.reference || '—',
      receivedByName: receiverById.get(p.receivedBy) || '—',
      notes: p.notes || '',
    })))

    const totalRow = workbook.getWorksheet('Payments').addRow({ shop: 'TOTAL', amount: payments.reduce((s, p) => s + num(p.amount), 0) })
    totalRow.font = { bold: true }

    await sendWorkbook(res, workbook, 'payments', req.query.format)
  } catch (err) { next(err) }
}

// ───────────── Orders ─────────────

const exportOrders = async (req, res, next) => {
  try {
    const where = { organizationId: ORG(req) }
    const orderDate = dateRangeFilter(req)
    if (orderDate) where.orderDate = orderDate
    if (req.query.status) where.status = req.query.status

    const orders = await prisma.order.findMany({
      where,
      include: { shop: { select: { name: true } }, salesman: { select: { name: true } }, invoice: { select: { isPaid: true } } },
      orderBy: { orderDate: 'desc' },
    })

    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Orders', [
      { header: 'Order No', key: 'orderNo', width: 22 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Shop', key: 'shop', width: 28 },
      { header: 'Salesman', key: 'salesman', width: 20 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Total', key: 'total', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Paid', key: 'paid', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Invoice Paid?', key: 'invoicePaid', width: 14 },
    ], orders.map((o) => ({
      orderNo: o.orderNo, date: o.orderDate.toISOString().slice(0, 10),
      shop: o.shop?.name || '—', salesman: o.salesman?.name || '—', status: o.status,
      total: num(o.totalAmount), paid: num(o.paidAmount),
      invoicePaid: o.invoice ? (o.invoice.isPaid ? 'Yes' : 'No') : '—',
    })))
    await sendWorkbook(res, workbook, 'orders', req.query.format)
  } catch (err) { next(err) }
}

// ───────────── Daily / Monthly sales ─────────────

const exportDailySales = async (req, res, next) => {
  try {
    const orgId = ORG(req)
    const days = Math.min(Number(req.query.days || 30), 365)
    const rows = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate() - i)
      const s = new Date(date); s.setHours(0, 0, 0, 0)
      const e = new Date(date); e.setHours(23, 59, 59, 999)
      const agg = await prisma.order.aggregate({
        where: { organizationId: orgId, orderDate: { gte: s, lte: e }, status: { in: SALE_STATUSES } },
        _sum: { totalAmount: true, paidAmount: true }, _count: true,
      })
      rows.push({
        date: date.toISOString().slice(0, 10),
        orders: agg._count,
        revenue: num(agg._sum.totalAmount),
        collected: num(agg._sum.paidAmount),
      })
    }
    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Daily Sales', [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '#,##0.00' } },
      { header: 'Collected', key: 'collected', width: 16, style: { numFmt: '#,##0.00' } },
    ], rows)
    await sendWorkbook(res, workbook, 'daily-sales', req.query.format)
  } catch (err) { next(err) }
}

const exportMonthlySales = async (req, res, next) => {
  try {
    const orgId = ORG(req)
    const months = Math.min(Number(req.query.months || 12), 60)
    const rows = []
    for (let i = months - 1; i >= 0; i--) {
      const ref = new Date(); ref.setDate(1); ref.setMonth(ref.getMonth() - i); ref.setHours(0, 0, 0, 0)
      const start = new Date(ref)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999)
      const agg = await prisma.order.aggregate({
        where: { organizationId: orgId, orderDate: { gte: start, lte: end }, status: { in: SALE_STATUSES } },
        _sum: { totalAmount: true, paidAmount: true }, _count: true,
      })
      rows.push({
        month: start.toLocaleDateString('en-PK', { year: 'numeric', month: 'short' }),
        orders: agg._count,
        revenue: num(agg._sum.totalAmount),
        collected: num(agg._sum.paidAmount),
      })
    }
    const workbook = new ExcelJS.Workbook()
    buildSheet(workbook, 'Monthly Sales', [
      { header: 'Month', key: 'month', width: 14 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '#,##0.00' } },
      { header: 'Collected', key: 'collected', width: 16, style: { numFmt: '#,##0.00' } },
    ], rows)
    await sendWorkbook(res, workbook, 'monthly-sales', req.query.format)
  } catch (err) { next(err) }
}

// ───────────── Product sales ratio (contribution to total qty/revenue) ─────────────

const exportProductSalesRatio = async (req, res, next) => {
  try {
    const orgId = ORG(req)
    const orderDate = dateRangeFilter(req)

    const agg = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { organizationId: orgId, status: { in: SALE_STATUSES }, ...(orderDate ? { orderDate } : {}) } },
      _sum: { quantity: true, subtotal: true },
    })

    const productIds = agg.map((a) => a.productId)
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, sku: true, category: true, unit: true } })
      : []
    const productById = new Map(products.map((p) => [p.id, p]))

    const totalQty = agg.reduce((s, a) => s + num(a._sum.quantity), 0)
    const totalRevenue = agg.reduce((s, a) => s + num(a._sum.subtotal), 0)

    const rows = agg
      .map((a) => {
        const p = productById.get(a.productId)
        const qty = num(a._sum.quantity), revenue = num(a._sum.subtotal)
        return {
          sku: p?.sku || '—', name: p?.name || 'Unknown product', category: p?.category || '—',
          qtySold: qty, revenue, qtySharePct: pct(qty, totalQty), revenueSharePct: pct(revenue, totalRevenue),
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    const workbook = new ExcelJS.Workbook()
    const sheet = buildSheet(workbook, 'Product Sales Ratio', [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Product', key: 'name', width: 28 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Qty Sold', key: 'qtySold', width: 12 },
      { header: 'Qty Share %', key: 'qtySharePct', width: 12 },
      { header: 'Revenue', key: 'revenue', width: 16, style: { numFmt: '#,##0.00' } },
      { header: 'Revenue Share %', key: 'revenueSharePct', width: 14 },
    ], rows)

    const totalRow = sheet.addRow({ name: 'TOTAL', qtySold: totalQty, revenue: totalRevenue, qtySharePct: 100, revenueSharePct: 100 })
    totalRow.font = { bold: true }

    await sendWorkbook(res, workbook, 'product-sales-ratio', req.query.format)
  } catch (err) { next(err) }
}

module.exports = {
  exportProducts, exportUsers, exportShops, exportCreditReport,
  exportPayments, exportOrders, exportDailySales, exportMonthlySales, exportProductSalesRatio,
}
