const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const getProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 100 } = req.query
    const where = { organizationId: ORG(req), isActive: true }
    if (category) where.category = category
    if (search) where.name = { contains: search, mode: 'insensitive' }
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { name: 'asc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
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
      SELECT * FROM "Product" WHERE "organizationId" = ${ORG(req)} AND "isActive" = true AND stock <= "minStock" ORDER BY stock ASC`
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
    const { name, sku, category, description, price, costPrice, stock, minStock, unit } = req.body
    if (!name || !sku || !category || !price) return res.status(400).json({ message: 'Name, SKU, category and price required' })
    const exists = await prisma.product.findUnique({ where: { organizationId_sku: { organizationId: ORG(req), sku } } })
    if (exists) return res.status(400).json({ message: 'SKU already exists' })
    const product = await prisma.product.create({ data: { organizationId: ORG(req), name, sku, category, description: description||null, price: Number(price), costPrice: Number(costPrice||0), stock: Number(stock||0), minStock: Number(minStock||10), unit: unit||'piece' } })
    res.status(201).json(product)
  } catch (err) { next(err) }
}

const updateProduct = async (req, res, next) => {
  try {
    const { name, category, description, price, costPrice, stock, minStock, unit, isActive } = req.body
    const data = {}
    if (name) data.name = name; if (category) data.category = category
    if (description !== undefined) data.description = description
    if (price) data.price = Number(price); if (costPrice !== undefined) data.costPrice = Number(costPrice)
    if (stock !== undefined) data.stock = Number(stock); if (minStock !== undefined) data.minStock = Number(minStock)
    if (unit) data.unit = unit; if (isActive !== undefined) data.isActive = isActive
    const p = await prisma.product.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data })
    if (!p.count) return res.status(404).json({ message: 'Product not found' })
    res.json(await prisma.product.findUnique({ where: { id: req.params.id } }))
  } catch (err) { next(err) }
}

const deleteProduct = async (req, res, next) => {
  try {
    await prisma.product.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data: { isActive: false } })
    res.json({ message: 'Product deactivated' })
  } catch (err) { next(err) }
}

module.exports = { getProducts, getProductById, getLowStockProducts, getCategories, createProduct, updateProduct, deleteProduct }
