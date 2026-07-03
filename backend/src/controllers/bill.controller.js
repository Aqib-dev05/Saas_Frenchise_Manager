// Bill (order receipt/challan) — a customer-facing document generated from any
// order regardless of status (including PENDING). Unlike the formal Invoice PDF,
// bills are never cached on Cloudinary: just built fresh and streamed.
// Salesmen can download bills for their own orders; Admins/Delivery see any.

const prisma = require('../lib/prisma')
const PDFDocument = require('pdfkit')

const ORG = (req) => req.user.organizationId

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const fetchLogoBuffer = async (url) => {
  if (!url) return null
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    return Buffer.from(await resp.arrayBuffer())
  } catch { return null }
}

const COLORS = {
  primary:   '#4338ca',
  dark:      '#111827',
  gray:      '#6b7280',
  lightGray: '#9ca3af',
  border:    '#e5e7eb',
  headerBg:  '#f5f3ff',
  amber:     '#d97706',
  amberBg:   '#fffbeb',
  amberBorder:'#fde68a',
  green:     '#059669',
}

const PAGE_MARGIN = 50

// ─── Header ──────────────────────────────────────────────────────────────────

const drawBillHeader = (doc, { org, order, logoBuffer, pageWidth }) => {
  const top = PAGE_MARGIN
  if (logoBuffer) {
    try { doc.image(logoBuffer, PAGE_MARGIN, top, { fit: [52, 52] }) } catch { /* skip */ }
  }
  const textX = logoBuffer ? PAGE_MARGIN + 66 : PAGE_MARGIN

  doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.dark)
    .text(org?.name || 'Franchise Manager', textX, top, { width: pageWidth * 0.55 })
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.gray)
  let leftY = top + 19
  for (const line of [org?.address, org?.phone ? `Ph: ${org.phone}` : null, org?.email].filter(Boolean)) {
    doc.text(line, textX, leftY, { width: pageWidth * 0.55 }); leftY += 11
  }

  // "BILL" right-aligned
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.primary).text('BILL', 0, top, { align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.dark)
  const meta = [
    ['Bill No', order.orderNo],
    ['Date',    fmtDate(order.orderDate || order.createdAt)],
    ['Status',  order.status],
    ['Salesman', order.salesman?.name || '—'],
  ]
  let rightY = top + 28
  for (const [label, value] of meta) {
    doc.fillColor(COLORS.gray).text(label + ':', 0, rightY, { align: 'right', width: pageWidth - 90 })
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').text(value, 0, rightY, { align: 'right', width: pageWidth })
    doc.font('Helvetica'); rightY += 12
  }
  return Math.max(leftY, rightY, top + 60) + 12
}

// ─── Shop info + previous balance ────────────────────────────────────────────

const drawShopSection = (doc, { order, pageWidth }, startY) => {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.lightGray)
    .text('BILL TO', PAGE_MARGIN, startY)
  let y = startY + 13

  doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.dark)
    .text(order.shop.name, PAGE_MARGIN, y)
  y += 15
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray)
  doc.text(order.shop.ownerName, PAGE_MARGIN, y); y += 11
  doc.text(order.shop.phone,     PAGE_MARGIN, y); y += 11
  doc.text(`${order.shop.address || ''}${order.shop.city ? ', ' + order.shop.city : ''}`, PAGE_MARGIN, y,
    { width: pageWidth * 0.48 })
  y += 13

  // Previous balance box — only draw when the shop has an outstanding balance
  const prevBalance = Number(order.shop.balance || 0)
  if (prevBalance > 0) {
    const boxX = PAGE_MARGIN
    const boxW = 180
    const boxH = 36
    doc.roundedRect(boxX, y, boxW, boxH, 5).fillColor(COLORS.amberBg).fill()
    doc.roundedRect(boxX, y, boxW, boxH, 5).strokeColor(COLORS.amberBorder).lineWidth(1).stroke()
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.amber)
      .text('PREVIOUS OUTSTANDING BALANCE', boxX + 8, y + 7, { width: boxW - 16 })
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.amber)
      .text(money(prevBalance), boxX + 8, y + 17, { width: boxW - 16 })
    y += boxH + 10
  }

  return y + 8
}

// ─── Items table ─────────────────────────────────────────────────────────────

const BILL_COLS = [
  { key: 'idx',      label: '#',        width: 24,  align: 'left' },
  { key: 'name',     label: 'Product',  width: 0,   align: 'left' },
  { key: 'qty',      label: 'Qty',      width: 60,  align: 'right' },
  { key: 'price',    label: 'Rate',     width: 90,  align: 'right' },
  { key: 'subtotal', label: 'Amount',   width: 90,  align: 'right' },
]

const drawBillTableHeader = (doc, y, pageWidth) => {
  const flexW = pageWidth - BILL_COLS.filter(c => c.width).reduce((s, c) => s + c.width, 0)
  doc.rect(PAGE_MARGIN, y, pageWidth, 22).fillColor(COLORS.headerBg).fill()
  let x = PAGE_MARGIN
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primary)
  for (const col of BILL_COLS) {
    const w = col.width || flexW
    doc.text(col.label.toUpperCase(), x + 6, y + 7, { width: w - 6, align: col.align })
    x += w
  }
  doc.fillColor(COLORS.dark).font('Helvetica')
  return y + 22
}

const drawBillTableRow = (doc, y, item, idx, pageWidth) => {
  const flexW = pageWidth - BILL_COLS.filter(c => c.width).reduce((s, c) => s + c.width, 0)
  const rowH = 22
  if (idx % 2 === 1) { doc.rect(PAGE_MARGIN, y, pageWidth, rowH).fillColor('#fafafa').fill() }
  let x = PAGE_MARGIN
  const vals = {
    idx: String(idx + 1),
    name: item.product?.name || 'Product',
    qty: `${item.quantity} ${item.product?.unit || ''}`.trim(),
    price: money(item.price),
    subtotal: money(item.subtotal),
  }
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.dark)
  for (const col of BILL_COLS) {
    const w = col.width || flexW
    doc.text(vals[col.key], x + 6, y + 6, { width: w - 6, align: col.align })
    x += w
  }
  return y + rowH
}

const drawBillItemsTable = (doc, items, startY, pageWidth, pageBottom) => {
  let y = drawBillTableHeader(doc, startY, pageWidth)
  for (let idx = 0; idx < items.length; idx++) {
    if (y + 22 > pageBottom) {
      doc.addPage(); y = PAGE_MARGIN
      y = drawBillTableHeader(doc, y, pageWidth)
    }
    y = drawBillTableRow(doc, y, items[idx], idx, pageWidth)
  }
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(COLORS.border).stroke()
  return y + 12
}

// ─── Totals + signature ───────────────────────────────────────────────────────

const drawBillTotals = (doc, order, startY, pageWidth) => {
  const boxW = 200
  const x = PAGE_MARGIN + pageWidth - boxW
  let y = startY

  const row = (label, value, opts = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 9.5)
      .fillColor(opts.color || COLORS.gray)
      .text(label, x, y, { width: boxW - 100 })
    doc.fillColor(opts.valueColor || COLORS.dark)
      .text(value, x + boxW - 100, y, { width: 100, align: 'right' })
    y += opts.gap || 15
  }

  row('Order Total', money(order.totalAmount))

  // If any payment was collected at booking (paidAmount on order itself)
  if (Number(order.paidAmount) > 0) {
    row('Amount Paid', money(order.paidAmount), { color: COLORS.green, valueColor: COLORS.green })
    doc.moveTo(x, y).lineTo(x + boxW, y).strokeColor(COLORS.border).stroke(); y += 7
    const balance = Number(order.totalAmount) - Number(order.paidAmount)
    row('Balance Due', money(balance), { bold: true, size: 11, color: COLORS.dark })
  }

  return y + 16
}

const drawBillSignatures = (doc, order, startY, pageWidth) => {
  let y = startY
  const lineLen = 130
  const gap = (pageWidth - lineLen * 2) / 3

  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.lightGray)
    .text('Received by (Shop Owner)', PAGE_MARGIN, y)
    .text('Delivered by', PAGE_MARGIN + lineLen + gap * 2, y)
  y += 30
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + lineLen, y).strokeColor(COLORS.border).lineWidth(0.8).stroke()
  doc.moveTo(PAGE_MARGIN + lineLen + gap * 2, y).lineTo(PAGE_MARGIN + lineLen * 2 + gap * 2, y).stroke()
  y += 10
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray)
    .text(order.shop.ownerName || '', PAGE_MARGIN, y)
    .text(order.salesman?.name || '', PAGE_MARGIN + lineLen + gap * 2, y)
  return y + 20
}

const drawBillFooter = (doc, pageWidth) => {
  const y = doc.page.height - doc.page.margins.bottom - 40
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(COLORS.border).stroke()
  doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.lightGray)
    .text('Thank you for your business.', PAGE_MARGIN, y + 8, { width: pageWidth, align: 'center' })
    .text(`Printed: ${new Date().toLocaleString('en-PK')}`, PAGE_MARGIN, y + 19, { width: pageWidth, align: 'center' })
}

// ─── Builder ─────────────────────────────────────────────────────────────────

const buildBillPdfBuffer = (order, org, logoBuffer) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true })
  const chunks = []
  doc.on('data', c => chunks.push(c))
  doc.on('end', () => resolve(Buffer.concat(chunks)))
  doc.on('error', reject)

  const pageWidth  = doc.page.width  - PAGE_MARGIN * 2
  const pageBottom = doc.page.height - PAGE_MARGIN - 60

  let y = drawBillHeader(doc, { org, order, logoBuffer, pageWidth })
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(COLORS.border).stroke()
  y += 16

  y = drawShopSection(doc, { order, pageWidth }, y)
  y = drawBillItemsTable(doc, order.items, y, pageWidth, pageBottom)

  const BOTTOM_BLOCK = 170
  if (y + BOTTOM_BLOCK > pageBottom) { doc.addPage(); y = PAGE_MARGIN }

  if (order.notes) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.lightGray).text('NOTES', PAGE_MARGIN, y); y += 11
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray)
      .text(order.notes, PAGE_MARGIN, y, { width: pageWidth - 220 }); y += 14
  }

  y = drawBillTotals(doc, order, y, pageWidth)
  y = drawBillSignatures(doc, order, y + 10, pageWidth)

  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    drawBillFooter(doc, pageWidth)
  }

  doc.end()
})

// ─── Endpoint ─────────────────────────────────────────────────────────────────

const downloadOrderBill = async (req, res, next) => {
  try {
    const where = { id: req.params.orderId, organizationId: ORG(req) }
    if (req.user.role === 'SALESMAN') where.salesmanId = req.user.userId

    const order = await prisma.order.findFirst({
      where,
      include: {
        shop: true,
        salesman: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true, sku: true } } } },
      },
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (!order.items?.length) return res.status(400).json({ message: 'Order has no items' })

    const org = await prisma.organization.findUnique({ where: { id: order.organizationId } })
    const logoBuffer = await fetchLogoBuffer(org?.logo)
    const buffer = await buildBillPdfBuffer(order, org, logoBuffer)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="bill-${order.orderNo}.pdf"`)
    res.send(buffer)
  } catch (err) { next(err) }
}

// Shop portal counterpart — shop owner can download their own bills.
// Scoped by shopId (from the portal token) so they can never access
// another shop's orders, same pattern as downloadInvoicePdfForShop.
const downloadBillForShop = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, shopId: req.shop.shopId },
      include: {
        shop: true,
        salesman: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true, unit: true, sku: true } } } },
      },
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (!order.items?.length) return res.status(400).json({ message: 'Order has no items' })

    const org = await prisma.organization.findUnique({ where: { id: order.organizationId } })
    const logoBuffer = await fetchLogoBuffer(org?.logo)
    const buffer = await buildBillPdfBuffer(order, org, logoBuffer)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="bill-${order.orderNo}.pdf"`)
    res.send(buffer)
  } catch (err) { next(err) }
}

module.exports = { downloadOrderBill, downloadBillForShop, _buildBillPdfBuffer: buildBillPdfBuffer }
