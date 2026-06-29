const prisma = require('../lib/prisma')
const bcrypt = require('bcryptjs')
const { deleteByUrl } = require('../lib/cloudinary')
const { generatePortalCode, generatePortalPassword } = require('../lib/shopPortal')
const ORG = (req) => req.user.organizationId

// Minimal projection for dropdown/lookup use-cases (route shop-picker,
// payment shop-selector) — avoids shipping notes, lat/lng, ownerPhoto,
// timestamps etc. when the UI only needs a name and a couple of badges.
const SHOP_SELECT_FULL = {
  id: true, name: true, ownerName: true, phone: true, address: true, city: true,
  latitude: true, longitude: true, type: true, balance: true, creditLimit: true,
  ownerPhoto: true, notes: true, isActive: true, createdAt: true, updatedAt: true,
  portalEnabled: true, portalCode: true, portalLastLoginAt: true, // never portalPasswordHash
}
const SHOP_SELECT_LOOKUP = { id: true, name: true, ownerName: true, type: true, balance: true, city: true, address: true }

const getShops = async (req, res, next) => {
  try {
    const { type, search, page = 1, limit = 100, lite } = req.query
    const where = { organizationId: ORG(req), isActive: true }
    if (type) where.type = type
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { ownerName: { contains: search, mode: 'insensitive' } },
    ]
    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        select: lite === 'true' ? SHOP_SELECT_LOOKUP : SHOP_SELECT_FULL,
        orderBy: { name: 'asc' },
        skip: (Number(page)-1)*Number(limit),
        take: Number(limit),
      }),
      prisma.shop.count({ where }),
    ])
    res.json({ shops, total })
  } catch (err) { next(err) }
}

const getShopById = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({
      where: { id: req.params.id, organizationId: ORG(req) },
      select: {
        ...SHOP_SELECT_FULL,
        orders: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, orderNo: true, status: true, totalAmount: true, paidAmount: true, createdAt: true, items: { select: { quantity: true, subtotal: true, product: { select: { name: true } } } } } },
        payments: { orderBy: { receivedAt: 'desc' }, take: 10, select: { id: true, amount: true, type: true, receivedAt: true } },
      },
    })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    res.json(shop)
  } catch (err) { next(err) }
}

const createShop = async (req, res, next) => {
  try {
    const { name, ownerName, phone, address, city, latitude, longitude, type, creditLimit, notes, ownerPhoto } = req.body
    if (!name || !ownerName || !phone || !address) return res.status(400).json({ message: 'Name, owner, phone and address required' })
    const shop = await prisma.shop.create({ data: { organizationId: ORG(req), name, ownerName, phone, address, city: city||'Lahore', latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null, type: type||'RETAIL', creditLimit: Number(creditLimit||0), notes: notes||null, ownerPhoto: ownerPhoto||null }, select: SHOP_SELECT_FULL })
    res.status(201).json(shop)
  } catch (err) { next(err) }
}

const updateShop = async (req, res, next) => {
  try {
    const existing = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!existing) return res.status(404).json({ message: 'Shop not found' })

    const { name, ownerName, phone, address, city, latitude, longitude, type, creditLimit, notes, isActive, ownerPhoto } = req.body
    const data = {}
    if (name) data.name = name; if (ownerName) data.ownerName = ownerName; if (phone) data.phone = phone
    if (address) data.address = address; if (city) data.city = city
    if (latitude !== undefined) data.latitude = latitude ? Number(latitude) : null
    if (longitude !== undefined) data.longitude = longitude ? Number(longitude) : null
    if (type) data.type = type; if (creditLimit !== undefined) data.creditLimit = Number(creditLimit)
    if (notes !== undefined) data.notes = notes; if (isActive !== undefined) data.isActive = isActive

    if (ownerPhoto !== undefined && existing.ownerPhoto && existing.ownerPhoto !== ownerPhoto) {
      await deleteByUrl(existing.ownerPhoto)
    }
    if (ownerPhoto !== undefined) data.ownerPhoto = ownerPhoto || null

    await prisma.shop.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data })
    res.json(await prisma.shop.findUnique({ where: { id: req.params.id }, select: SHOP_SELECT_FULL }))
  } catch (err) { next(err) }
}

const deleteShop = async (req, res, next) => {
  try {
    const existing = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!existing) return res.status(404).json({ message: 'Shop not found' })
    if (existing.ownerPhoto) await deleteByUrl(existing.ownerPhoto)

    await prisma.shop.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data: { isActive: false, ownerPhoto: null } })
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

// Generates (or rotates) the shop owner's portal login. The plaintext
// password is returned exactly once — only its bcrypt hash is ever stored —
// so the admin must copy it down immediately to hand to the shop owner.
// The portalCode is reused across regenerations once assigned; only the
// password rotates, so a re-issued shop doesn't get a brand-new "username".
const generatePortalCredentials = async (req, res, next) => {
  try {
    const shop = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })

    const code = shop.portalCode || generatePortalCode()
    const password = generatePortalPassword()
    const portalPasswordHash = await bcrypt.hash(password, 10)

    await prisma.shop.update({
      where: { id: shop.id },
      data: { portalCode: code, portalPasswordHash, portalEnabled: true },
    })

    res.json({ code, password }) // password shown once; never persisted in plaintext anywhere
  } catch (err) { next(err) }
}

const togglePortalAccess = async (req, res, next) => {
  try {
    const { enabled } = req.body
    const shop = await prisma.shop.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!shop) return res.status(404).json({ message: 'Shop not found' })
    if (enabled && !shop.portalCode) return res.status(400).json({ message: 'Generate portal credentials before enabling access' })

    await prisma.shop.update({ where: { id: shop.id }, data: { portalEnabled: !!enabled } })
    res.json({ portalEnabled: !!enabled })
  } catch (err) { next(err) }
}

module.exports = { getShops, getShopById, createShop, updateShop, deleteShop, getShopTransactions, generatePortalCredentials, togglePortalAccess }
