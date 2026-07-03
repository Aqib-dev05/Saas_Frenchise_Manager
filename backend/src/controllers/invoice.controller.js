const prisma = require('../lib/prisma')
const PDFDocument = require('pdfkit')
const { uploadRawBuffer, destroy } = require('../lib/cloudinary')

const ORG = (req) => req.user.organizationId

const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

// Org logos are Cloudinary URLs — fetch the bytes so they can be embedded.
// Failure here (network hiccup, missing logo, unsupported format) must never
// block invoice generation, so every error path just falls back to no-logo.
const fetchLogoBuffer = async (url) => {
  if (!url || typeof url !== 'string') return null
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    const arrayBuffer = await resp.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

// Pulls a previously-cached invoice PDF back from Cloudinary. Returns null
// (rather than throwing) on any failure — e.g. the cached file was removed
// via "Clear PDF History" — so the caller falls back to regenerating it.
const fetchCachedPdfBuffer = async (url) => {
  if (!url) return null
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    return Buffer.from(await resp.arrayBuffer())
  } catch {
    return null
  }
}

const COLORS = {
  primary:    '#4338ca',
  dark:       '#111827',
  gray:       '#6b7280',
  lightGray:  '#9ca3af',
  border:     '#e5e7eb',
  headerBg:   '#f5f3ff',
  green:      '#059669',
  amber:      '#d97706',
  amberBg:    '#fffbeb',
  amberBorder:'#fde68a',
  red:        '#dc2626',
}

const PAGE_MARGIN = 50

// `extraWhere` lets callers scope the lookup beyond just the order id —
// staff routes scope by organizationId, the shop portal scopes by shopId
// (and implicitly organizationId via the shop's own org). Same function,
// same caching/regeneration pipeline either way.
const getInvoiceData = async (orderId, extraWhere) => {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...extraWhere },
    include: {
      shop: { select: { id: true, name: true, ownerName: true, phone: true, address: true, city: true, balance: true, type: true } },
      salesman: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true, unit: true, sku: true } } } },
      invoice: true,
    },
  })
  if (!order) return { error: { status: 404, message: 'Order not found' } }
  if (!order.invoice) return { error: { status: 400, message: 'No invoice has been generated for this order yet' } }

  const org = await prisma.organization.findUnique({ where: { id: order.organizationId } })
  return { order, org }
}

const drawHeader = (doc, { org, order, logoBuffer, pageWidth }) => {
  const top = PAGE_MARGIN
  const hasLogo = !!logoBuffer
  if (hasLogo) {
    try { doc.image(logoBuffer, PAGE_MARGIN, top, { fit: [56, 56] }) } catch { /* corrupt/unsupported image, skip */ }
  }

  const textX = hasLogo ? PAGE_MARGIN + 70 : PAGE_MARGIN
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.dark).text(org?.name || 'Franchise Manager', textX, top, { width: pageWidth * 0.5 })
  doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.gray)
  let leftY = top + 20
  const leftLines = [org?.address, org?.phone ? `Phone: ${org.phone}` : null, org?.email].filter(Boolean)
  for (const line of leftLines) { doc.text(line, textX, leftY, { width: pageWidth * 0.5 }); leftY += 12 }

  // Right-aligned invoice meta block
  doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.primary).text('INVOICE', 0, top, { align: 'right' })
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.dark)
  const metaRows = [
    ['Invoice No', order.invoice.invoiceNo],
    ['Order No', order.orderNo],
    ['Order Date', fmtDate(order.orderDate)],
    ['Due Date', fmtDate(order.invoice.dueDate)],
  ]
  let rightY = top + 26
  for (const [label, value] of metaRows) {
    doc.fillColor(COLORS.gray).text(label + ':', 0, rightY, { align: 'right', width: pageWidth - 90 })
    doc.fillColor(COLORS.dark).font('Helvetica-Bold').text(value, 0, rightY, { align: 'right', width: pageWidth })
    doc.font('Helvetica')
    rightY += 13
  }

  return Math.max(leftY, rightY, top + 66) + 15
}

const drawStatusBadge = (doc, x, y, invoice) => {
  const due = Number(invoice.amount) - Number(invoice.paid)
  let label = 'UNPAID', color = COLORS.red
  if (invoice.isPaid) { label = 'PAID'; color = COLORS.green }
  else if (Number(invoice.paid) > 0 && due > 0) { label = 'PARTIALLY PAID'; color = COLORS.amber }
  const width = doc.widthOfString(label, { font: 'Helvetica-Bold', size: 9 }) + 16
  doc.roundedRect(x, y, width, 18, 9).fillColor(color).fillOpacity(0.12).fill()
  doc.fillOpacity(1).font('Helvetica-Bold').fontSize(9).fillColor(color).text(label, x, y + 5, { width, align: 'center' })
  doc.fillColor(COLORS.dark).font('Helvetica')
}

const drawBillToAndStatus = (doc, { order, pageWidth }, startY) => {
  const colWidth = pageWidth / 2 - 10
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.lightGray).text('BILL TO', PAGE_MARGIN, startY)
  doc.text('STATUS', PAGE_MARGIN + pageWidth / 2, startY)

  let y = startY + 14
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.dark).text(order.shop.name, PAGE_MARGIN, y, { width: colWidth })
  drawStatusBadge(doc, PAGE_MARGIN + pageWidth / 2, y - 2, order.invoice)

  y += 16
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray)
  doc.text(order.shop.ownerName, PAGE_MARGIN, y, { width: colWidth })
  if (order.salesman) doc.text(`Booked by: ${order.salesman.name}`, PAGE_MARGIN + pageWidth / 2, y, { width: colWidth })
  y += 12
  doc.text(order.shop.phone, PAGE_MARGIN, y, { width: colWidth })
  y += 12
  const addrHeight = doc.heightOfString(order.shop.address || '', { width: colWidth })
  doc.text(`${order.shop.address || ''}${order.shop.city ? ', ' + order.shop.city : ''}`, PAGE_MARGIN, y, { width: colWidth })
  y += Math.max(addrHeight, 12) + 8

  // Previous outstanding balance box — shown only when the shop has a running
  // balance. This is the credit they owed BEFORE this order, so the shopkeeper
  // can see their full picture at a glance without having to ask.
  const prevBalance = Number(order.shop.balance || 0)
  if (prevBalance > 0) {
    const boxW = 190
    const boxH = 38
    doc.roundedRect(PAGE_MARGIN, y, boxW, boxH, 5)
      .fillColor('#fffbeb').fill()
    doc.roundedRect(PAGE_MARGIN, y, boxW, boxH, 5)
      .strokeColor('#fde68a').lineWidth(1).stroke()
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.amber)
      .text('PREVIOUS OUTSTANDING BALANCE', PAGE_MARGIN + 8, y + 7, { width: boxW - 16 })
    doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.amber)
      .text(money(prevBalance), PAGE_MARGIN + 8, y + 18, { width: boxW - 16 })
    y += boxH + 10
  }

  return y + 8
}

const TABLE_COLS = [
  { key: 'idx', label: '#', width: 24, align: 'left' },
  { key: 'name', label: 'Product', width: 0, align: 'left' }, // flexible, filled at draw time
  { key: 'qty', label: 'Qty', width: 60, align: 'right' },
  { key: 'price', label: 'Unit Price', width: 90, align: 'right' },
  { key: 'subtotal', label: 'Subtotal', width: 90, align: 'right' },
]

const drawTableHeader = (doc, y, pageWidth) => {
  const flexWidth = pageWidth - TABLE_COLS.filter(c => c.width).reduce((s, c) => s + c.width, 0)
  doc.rect(PAGE_MARGIN, y, pageWidth, 24).fillColor(COLORS.headerBg).fill()
  let x = PAGE_MARGIN
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primary)
  for (const col of TABLE_COLS) {
    const w = col.width || flexWidth
    doc.text(col.label.toUpperCase(), x + 8, y + 8, { width: w - 8, align: col.align })
    x += w
  }
  doc.fillColor(COLORS.dark).font('Helvetica')
  return y + 24
}

const drawTableRow = (doc, y, item, idx, pageWidth) => {
  const flexWidth = pageWidth - TABLE_COLS.filter(c => c.width).reduce((s, c) => s + c.width, 0)
  const rowH = 22
  if (idx % 2 === 1) { doc.rect(PAGE_MARGIN, y, pageWidth, rowH).fillColor('#fafafa').fill(); doc.fillColor(COLORS.dark) }
  let x = PAGE_MARGIN
  const values = {
    idx: String(idx + 1),
    name: `${item.product?.name || 'Product'}${item.product?.sku ? '  (' + item.product.sku + ')' : ''}`,
    qty: `${item.quantity} ${item.product?.unit || ''}`.trim(),
    price: money(item.price),
    subtotal: money(item.subtotal),
  }
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.dark)
  for (const col of TABLE_COLS) {
    const w = col.width || flexWidth
    doc.text(values[col.key], x + 8, y + 6, { width: w - 8, align: col.align })
    x += w
  }
  return y + rowH
}

const drawItemsTable = (doc, items, startY, pageWidth, pageBottom) => {
  let y = drawTableHeader(doc, startY, pageWidth)
  items.forEach((item, idx) => {
    if (y + 22 > pageBottom) {
      doc.addPage()
      y = PAGE_MARGIN
      y = drawTableHeader(doc, y, pageWidth)
    }
    y = drawTableRow(doc, y, item, idx, pageWidth)
  })
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(COLORS.border).stroke()
  return y + 16
}

const drawTotals = (doc, order, startY, pageWidth) => {
  const due = Number(order.invoice.amount) - Number(order.invoice.paid)
  const prevBalance = Number(order.shop.balance || 0)
  const boxWidth = 240
  const x = PAGE_MARGIN + pageWidth - boxWidth
  let y = startY

  const row = (label, value, opts = {}) => {
    doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 9.5)
      .fillColor(opts.color || COLORS.gray)
      .text(label, x, y, { width: boxWidth - 110 })
    doc.fillColor(opts.valueColor || opts.color || COLORS.dark)
      .text(opts.valueText ?? value, x + boxWidth - 110, y, { width: 110, align: 'right' })
    y += opts.gap || 16
  }

  // This invoice
  row('Order Total', money(order.totalAmount))
  row('Amount Paid', money(order.invoice.paid), { color: COLORS.green, valueColor: COLORS.green })
  doc.moveTo(x, y).lineTo(x + boxWidth, y).strokeColor(COLORS.border).stroke(); y += 8
  row('Balance Due (This Order)', money(due), { bold: true, size: 10.5, color: COLORS.dark, valueColor: due > 0 ? COLORS.red : COLORS.green })

  // Running account total — only shown for CREDIT/WHOLESALE shops that carry a balance.
  // This makes the invoice self-contained: shopkeeper sees exactly how much
  // they owe in total, not just for this order.
  if (prevBalance > 0) {
    y += 8
    doc.moveTo(x, y).lineTo(x + boxWidth, y).strokeColor(COLORS.amberBorder || '#fde68a').dash(3, { space: 3 }).stroke()
    doc.undash(); y += 8
    row('Previous Balance', money(prevBalance), { color: COLORS.amber, valueColor: COLORS.amber })
    const totalOutstanding = due + prevBalance
    doc.moveTo(x, y).lineTo(x + boxWidth, y).strokeColor(COLORS.amber).lineWidth(1.5).stroke()
    doc.lineWidth(1); y += 8
    row('Total Account Balance', money(totalOutstanding), { bold: true, size: 12, color: COLORS.amber, valueColor: COLORS.amber })
  }

  return y + 20
}

const drawFooter = (doc, pageWidth) => {
  // Sits inside the bottom margin band but must stay clear of the page's
  // actual printable-bottom limit, or pdfkit's auto-pagination kicks in and
  // silently appends a blank page underneath every page we draw a footer on.
  const y = doc.page.height - doc.page.margins.bottom - 45
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(COLORS.border).stroke()
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.lightGray)
    .text('Thank you for your business.', PAGE_MARGIN, y + 10, { width: pageWidth, align: 'center', lineBreak: false })
    .text(`Generated on ${new Date().toLocaleString('en-PK')}`, PAGE_MARGIN, y + 22, { width: pageWidth, align: 'center', lineBreak: false })
}

// Builds the full invoice PDF in memory and resolves with the finished
// Buffer. Same layout/pagination logic as before — just collected instead
// of piped directly to an HTTP response — so it can be cached on Cloudinary
// before being sent to the client.
const buildInvoicePdfBuffer = (order, org, logoBuffer) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true })
  const chunks = []
  doc.on('data', (chunk) => chunks.push(chunk))
  doc.on('end', () => resolve(Buffer.concat(chunks)))
  doc.on('error', reject)

  const pageWidth = doc.page.width - PAGE_MARGIN * 2
  const pageBottom = doc.page.height - PAGE_MARGIN - 60 // leave room for footer

  let y = drawHeader(doc, { org, order, logoBuffer, pageWidth })
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + pageWidth, y).strokeColor(COLORS.border).stroke()
  y += 18

  y = drawBillToAndStatus(doc, { order, pageWidth }, y)
  y = drawItemsTable(doc, order.items, y, pageWidth, pageBottom)

  // Notes + totals need ~140pt; if the items table left too little room on
  // this page, start fresh rather than letting pdfkit auto-overflow.
  const FOOTER_BLOCK_HEIGHT = 140
  if (y + FOOTER_BLOCK_HEIGHT > pageBottom) {
    doc.addPage()
    y = PAGE_MARGIN
  }

  if (order.notes) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.lightGray).text('NOTES', PAGE_MARGIN, y)
    y += 12
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.gray).text(order.notes, PAGE_MARGIN, y, { width: pageWidth - 240 })
  }

  drawTotals(doc, order, y, pageWidth)

  // Footer is drawn on every buffered page after layout is finalized.
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    drawFooter(doc, pageWidth)
  }

  doc.end()
})

// Uploads the freshly-generated PDF to Cloudinary (organized under
// franchise-manager/<org>/invoices, separate from avatars/products/shops),
// and stamps the invoice row with where it lives + when it was generated.
// public_id is pinned to the invoice number so re-generation overwrites the
// same asset rather than littering Cloudinary with stale copies.
const cacheInvoicePdf = async (order, buffer) => {
  const result = await uploadRawBuffer(buffer, {
    folder: `franchise-manager/${order.organizationId}/invoices`,
    publicId: order.invoice.invoiceNo,
  })
  return prisma.invoice.update({
    where: { id: order.invoice.id },
    data: { pdfUrl: result.secure_url, pdfPublicId: result.public_id, pdfGeneratedAt: new Date() },
  })
}

const downloadInvoicePdf = async (req, res, next) => {
  try {
    const { order, org, error } = await getInvoiceData(req.params.orderId, { organizationId: ORG(req) })
    if (error) return res.status(error.status).json({ message: error.message })
    await respondWithInvoicePdf(req, res, order, org)
  } catch (err) { next(err) }
}

// Shop-portal counterpart — a shop owner may only ever download invoices for
// their own shop, never just "their organization" (they have no concept of
// other shops in the org). Everything past the lookup is identical.
const downloadInvoicePdfForShop = async (req, res, next) => {
  try {
    const { order, org, error } = await getInvoiceData(req.params.orderId, { shopId: req.shop.shopId })
    if (error) return res.status(error.status).json({ message: error.message })
    await respondWithInvoicePdf(req, res, order, org)
  } catch (err) { next(err) }
}

const respondWithInvoicePdf = async (req, res, order, org) => {
  // Cache is valid only if it was generated at/after the invoice's last
  // data change — a new payment or status update bumps `updatedAt` past
  // `pdfGeneratedAt`, which correctly invalidates the cached file.
  const isCacheValid = order.invoice.pdfUrl && order.invoice.pdfGeneratedAt
    && new Date(order.invoice.pdfGeneratedAt) >= new Date(order.invoice.updatedAt)

  let buffer = isCacheValid ? await fetchCachedPdfBuffer(order.invoice.pdfUrl) : null
  let invoiceNo = order.invoice.invoiceNo

  if (!buffer) {
    const logoBuffer = await fetchLogoBuffer(org?.logo)
    buffer = await buildInvoicePdfBuffer(order, org, logoBuffer)
    try {
      const updated = await cacheInvoicePdf(order, buffer)
      invoiceNo = updated.invoiceNo
    } catch (cacheErr) {
      // Caching is an optimization, not a hard requirement — if Cloudinary
      // is briefly unreachable, still serve the freshly-built PDF.
      console.error('Invoice PDF cache upload failed:', cacheErr.message)
    }
  }

  res.setHeader('Content-Type', 'application/pdf')
  const inline = req.query.inline === 'true'
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${invoiceNo}.pdf"`)
  res.send(buffer)
}

// Admin-only "Clear Invoice History" action — deletes the cached PDF files
// from Cloudinary and forgets where they were stored, WITHOUT touching the
// Invoice rows' amount/paid/isPaid fields (those are the payment ledger and
// must survive). The next download simply regenerates the file.
const clearInvoicePdfHistory = async (req, res, next) => {
  try {
    const cached = await prisma.invoice.findMany({
      where: { order: { organizationId: ORG(req) }, pdfPublicId: { not: null } },
      select: { id: true, pdfPublicId: true },
    })
    await Promise.all(cached.map((inv) => destroy(inv.pdfPublicId, 'raw')))
    await prisma.invoice.updateMany({
      where: { id: { in: cached.map((inv) => inv.id) } },
      data: { pdfUrl: null, pdfPublicId: null, pdfGeneratedAt: null },
    })
    res.json({ cleared: cached.length })
  } catch (err) { next(err) }
}

module.exports = { downloadInvoicePdf, downloadInvoicePdfForShop, clearInvoicePdfHistory }
