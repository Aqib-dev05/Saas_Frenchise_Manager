const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const getRoutes = async (req, res, next) => {
  try {
    const where = { organizationId: ORG(req), isActive: true }
    if (req.user.role === 'SALESMAN') where.salesmanId = req.user.userId
    const routes = await prisma.route.findMany({
      where,
      include: {
        salesman: { select: { id: true, name: true } },
        routeShops: { orderBy: { visitOrder: 'asc' }, include: { shop: true } },
        _count: { select: { routeShops: true } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(routes)
  } catch (err) { next(err) }
}

const getTodayRoute = async (req, res, next) => {
  try {
    const today = new Date().getDay()
    const routes = await prisma.route.findMany({
      where: { organizationId: ORG(req), salesmanId: req.user.userId, isActive: true, daysOfWeek: { has: today } },
      include: { routeShops: { orderBy: { visitOrder: 'asc' }, include: { shop: true } } },
    })

    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)

    const enriched = await Promise.all(routes.map(async (route) => {
      const enrichedShops = await Promise.all(route.routeShops.map(async (rs) => {
        const todayOrder = await prisma.order.findFirst({
          where: { shopId: rs.shopId, salesmanId: req.user.userId, orderDate: { gte: todayStart, lte: todayEnd } },
          include: { items: { include: { product: { select: { name: true, unit: true } } } } },
        })
        return { ...rs, todayOrder }
      }))
      return { ...route, routeShops: enrichedShops }
    }))
    res.json(enriched)
  } catch (err) { next(err) }
}

const getRouteById = async (req, res, next) => {
  try {
    const route = await prisma.route.findFirst({
      where: { id: req.params.id, organizationId: ORG(req) },
      include: { salesman: { select: { id: true, name: true } }, routeShops: { orderBy: { visitOrder: 'asc' }, include: { shop: true } } },
    })
    if (!route) return res.status(404).json({ message: 'Route not found' })
    res.json(route)
  } catch (err) { next(err) }
}

const createRoute = async (req, res, next) => {
  try {
    const { name, description, daysOfWeek, salesmanId } = req.body
    if (!name || !daysOfWeek || !salesmanId) return res.status(400).json({ message: 'Name, days and salesman required' })
    const route = await prisma.route.create({
      data: { organizationId: ORG(req), name, description: description||null, daysOfWeek: daysOfWeek.map(Number), salesmanId },
      include: { salesman: { select: { id: true, name: true } }, routeShops: true },
    })
    res.status(201).json(route)
  } catch (err) { next(err) }
}

const updateRoute = async (req, res, next) => {
  try {
    const { name, description, daysOfWeek, salesmanId, isActive } = req.body
    const data = {}
    if (name) data.name = name; if (description !== undefined) data.description = description
    if (daysOfWeek) data.daysOfWeek = daysOfWeek.map(Number)
    if (salesmanId) data.salesmanId = salesmanId; if (isActive !== undefined) data.isActive = isActive
    await prisma.route.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data })
    res.json(await prisma.route.findUnique({ where: { id: req.params.id }, include: { salesman: { select: { id: true, name: true } }, routeShops: { orderBy: { visitOrder: 'asc' }, include: { shop: true } } } }))
  } catch (err) { next(err) }
}

const deleteRoute = async (req, res, next) => {
  try {
    await prisma.route.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data: { isActive: false } })
    res.json({ message: 'Route deactivated' })
  } catch (err) { next(err) }
}

const addShopToRoute = async (req, res, next) => {
  try {
    const { routeId } = req.params; const { shopId, visitOrder } = req.body
    const route = await prisma.route.findFirst({ where: { id: routeId, organizationId: ORG(req) } })
    if (!route) return res.status(404).json({ message: 'Route not found' })
    const max = await prisma.routeShop.aggregate({ where: { routeId }, _max: { visitOrder: true } })
    const order = visitOrder || (max._max.visitOrder || 0) + 1
    const rs = await prisma.routeShop.create({ data: { routeId, shopId, visitOrder: order }, include: { shop: true } })
    res.status(201).json(rs)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ message: 'Shop already in route' })
    next(err)
  }
}

const removeShopFromRoute = async (req, res, next) => {
  try {
    await prisma.routeShop.deleteMany({ where: { routeId: req.params.routeId, shopId: req.params.shopId } })
    res.json({ message: 'Shop removed from route' })
  } catch (err) { next(err) }
}

const reorderRouteShops = async (req, res, next) => {
  try {
    const { shops } = req.body // [{ shopId, visitOrder }]
    await Promise.all(shops.map(({ shopId, visitOrder }) =>
      prisma.routeShop.updateMany({ where: { routeId: req.params.routeId, shopId }, data: { visitOrder } })
    ))
    res.json({ message: 'Route order updated' })
  } catch (err) { next(err) }
}

module.exports = { getRoutes, getTodayRoute, getRouteById, createRoute, updateRoute, deleteRoute, addShopToRoute, removeShopFromRoute, reorderRouteShops }
