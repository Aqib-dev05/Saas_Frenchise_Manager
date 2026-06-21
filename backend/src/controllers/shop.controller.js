const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const getShops = async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 100 } = req.query
    const where = { organizationId: ORG(req), isActive: true }
    if (type) where.type = type
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
    ]
    const [shops, total] = await Promise.all([
      prisma.shop.findMany({ where, orderBy: { name: 'asc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
      prisma.shop.count({ where }),
    ])
    res.json({ shops, total })
  } catch (err) { next(err) }
}

const getShopById = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: { id: req.params.id, organizationId: ORG(req) },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { product: { select: { name: true } } } } } },
        payments: { orderBy: { receivedAt: 'desc' }, take: 10 },
      }
    })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    res.json(shop)
  } catch (err) { next(err) }
}

const createShop = async (req, res, next) => {
  try {
    const { name, ownerName, phone, address, city, latitude, longitude, type, creditLimit, notes } = req.body
    if (!name || !ownerName || !phone || !address) return res.status(400).json({ message: 'Name, owner, phone and address required' })
    const shop = await prisma.shop.create({ data: { organizationId: ORG(req), name, ownerName, phone, address, city: city||'Lahore', latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null, type: type||'RETAIL', creditLimit: Number(creditLimit||0), notes: notes||null } })
    res.status(201).json(shop)
  } catch (err) { next(err) }
}

const updateShop = async (req, res, next) => {
  try {
    const { name, ownerName, phone, address, city, latitude, longitude, type, creditLimit, notes, isActive } = req.body
    const data = {}
    if (name) data.name = name; if (ownerName) data.ownerName = ownerName; if (phone) data.phone = phone
    if (address) data.address = address; if (city) data.city = city
    if (latitude !== undefined) data.latitude = latitude ? Number(latitude) : null
    if (longitude !== undefined) data.longitude = longitude ? Number(longitude) : null
    if (type) data.type = type; if (creditLimit !== undefined) data.creditLimit = Number(creditLimit)
    if (notes !== undefined) data.notes = notes; if (isActive !== undefined) data.isActive = isActive
    await prisma.shop.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data })
    res.json(await prisma.shop.findUnique({ where: { id: req.params.id } }))
  } catch (err) { next(err) }
}

const deleteShop = async (req, res, next) => {
  try {
    await prisma.shop.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data: { isActive: false } })
    res.json({ message: 'Shop deactivated' })
  } catch (err) { next(err) }
}

const getShopTransactions = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    const [orders, payments] = await Promise.all([
      prisma.order.findMany({ where: { shopId: req.params.id }, include: { items: { include: { product: { select: { name: true } } } }, invoice: true }, orderBy: { createdAt: 'desc' }, take: 25 }),
      prisma.payment.findMany({ where: { shopId: req.params.id }, orderBy: { receivedAt: 'desc' }, take: 25 }),
    ])
    res.json({ orders, payments })
  } catch (err) { next(err) }
}

module.exports = { getShops, getShopById, createShop, updateShop, deleteShop, getShopTransactions }
