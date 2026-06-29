const prisma = require('../lib/prisma')
const { deleteManyByUrls } = require('../lib/cloudinary')
const ORG = (req) => req.user.organizationId

const MAX_PRODUCT_IMAGES = 2

// Full projection (admin Products page — table + edit-form prefill needs
// everything except the internal organizationId tenant key).
const PRODUCT_SELECT_FULL = {
  id: true, name: true, sku: true, category: true, description: true,
  price: true, costPrice: true, stock: true, minStock: true, unit: true,
  images: true, isActive: true, createdAt: true, updatedAt: true,
}
// Minimal projection for order-booking dropdowns (salesman OrderModal) —
// only what's needed to pick a product and show its price/stock.
const PRODUCT_SELECT_LOOKUP = { id: true, name: true, price: true, unit: true, stock: true, minStock: true }

const getProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 100, lite } = req.query
    const where = { organizationId: ORG(req), isActive: true }
    if (category) where.category = category
    if (search) where.name = { contains: search, mode: 'insensitive' }
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: lite === 'true' ? PRODUCT_SELECT_LOOKUP : PRODUCT_SELECT_FULL,
        orderBy: { name: 'asc' },
        skip: (Number(page)-1)*Number(limit),
        take: Number(limit),
      }),
      prisma.product.count({ where }),
    ])
    res.json({ products: products.map(p => ({ ...p, isLowStock: p.stock <= p.minStock })), total })
  } catch (err) { next(err) }
}

const getProductById = async (req, res, next) => {
  try {
    const p = await prisma.product.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!p) return res.status(404).json({ message: 'Product not found' })
    res.json(p)
  } catch (err) { next(err) }
}

const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await prisma.$queryRaw`
      SELECT id, name, sku, category, stock, "minStock", unit FROM "Product"
      WHERE "organizationId" = ${ORG(req)} AND "isActive" = true AND stock <= "minStock" ORDER BY stock ASC`
    res.json(products)
  } catch (err) { next(err) }
}

const getCategories = async (req, res, next) => {
  try {
    const cats = await prisma.product.findMany({ where: { organizationId: ORG(req), isActive: true }, select: { category: true }, distinct: ['category'] })
    res.json(cats.map(c => c.category))
  } catch (err) { next(err) }
}

const createProduct = async (req, res, next) => {
  try {
    const { name, sku, category, description, price, costPrice, stock, minStock, unit, images } = req.body
    if (!name || !sku || !category || !price) return res.status(400).json({ message: 'Name, SKU, category and price required' })
    const exists = await prisma.product.findUnique({ where: { organizationId_sku: { organizationId: ORG(req), sku } } })
    if (exists) return res.status(400).json({ message: 'SKU already exists' })

    let imageList = Array.isArray(images) ? images.filter(Boolean) : []
    if (imageList.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({ message: `Maximum ${MAX_PRODUCT_IMAGES} images allowed per product` })
    }

    const product = await prisma.product.create({ data: { organizationId: ORG(req), name, sku, category, description: description||null, price: Number(price), costPrice: Number(costPrice||0), stock: Number(stock||0), minStock: Number(minStock||10), unit: unit||'piece', images: imageList } })
    res.status(201).json(product)
  } catch (err) { next(err) }
}

const updateProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!existing) return res.status(404).json({ message: 'Product not found' })

    const { name, category, description, price, costPrice, stock, minStock, unit, isActive, images } = req.body
    const data = {}
    if (name) data.name = name; if (category) data.category = category
    if (description !== undefined) data.description = description
    if (price) data.price = Number(price); if (costPrice !== undefined) data.costPrice = Number(costPrice)
    if (stock !== undefined) data.stock = Number(stock); if (minStock !== undefined) data.minStock = Number(minStock)
    if (unit) data.unit = unit; if (isActive !== undefined) data.isActive = isActive

    if (images !== undefined) {
      const imageList = Array.isArray(images) ? images.filter(Boolean) : []
      if (imageList.length > MAX_PRODUCT_IMAGES) {
        return res.status(400).json({ message: `Maximum ${MAX_PRODUCT_IMAGES} images allowed per product` })
      }
      // Clean up any images that were removed/replaced
      const removed = (existing.images || []).filter(old => !imageList.includes(old))
      if (removed.length) await deleteManyByUrls(removed)
      data.images = imageList
    }

    const p = await prisma.product.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data })
    if (!p.count) return res.status(404).json({ message: 'Product not found' })
    res.json(await prisma.product.findUnique({ where: { id: req.params.id } }))
  } catch (err) { next(err) }
}

const deleteProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!existing) return res.status(404).json({ message: 'Product not found' })
    if (existing.images?.length) await deleteManyByUrls(existing.images)

    await prisma.product.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data: { isActive: false, images: [] } })
    res.json({ message: 'Product deactivated' })
  } catch (err) { next(err) }
}

module.exports = { getProducts, getProductById, getLowStockProducts, getCategories, createProduct, updateProduct, deleteProduct }
