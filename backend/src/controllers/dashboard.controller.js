const prisma = require('../lib/prisma')
const ORG = (req) => req.user.organizationId

const getStats = async (req, res, next) => {
  try {
    const orgId = ORG(req)
    const todayS = new Date(); todayS.setHours(0,0,0,0)
    const todayE = new Date(); todayE.setHours(23,59,59,999)
    const monthS = new Date(); monthS.setDate(1); monthS.setHours(0,0,0,0)

    const [totalShops, activeRoutes, todayOrders, todayRevenue, monthRevenue, pendingOrders, totalCredit, totalProducts] = await Promise.all([
      prisma.shop.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.route.count({ where: { organizationId: orgId, isActive: true } }),
      prisma.order.count({ where: { organizationId: orgId, orderDate: { gte: todayS, lte: todayE } } }),
      prisma.order.aggregate({ where: { organizationId: orgId, orderDate: { gte: todayS, lte: todayE }, status: { in: ['CONFIRMED','DELIVERED'] } }, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: { organizationId: orgId, orderDate: { gte: monthS }, status: { in: ['CONFIRMED','DELIVERED'] } }, _sum: { totalAmount: true } }),
      prisma.order.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      prisma.shop.aggregate({ where: { organizationId: orgId }, _sum: { balance: true } }),
      prisma.product.count({ where: { organizationId: orgId, isActive: true } }),
    ])

    const lowStockProducts = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product" WHERE "organizationId" = ${orgId} AND "isActive" = true AND stock <= "minStock"`

    res.json({
      totalShops, activeRoutes, todayOrders, totalProducts,
      todayRevenue: Number(todayRevenue._sum.totalAmount || 0),
      monthRevenue: Number(monthRevenue._sum.totalAmount || 0),
      pendingOrders,
      totalCreditOutstanding: Number(totalCredit._sum.balance || 0),
      lowStockCount: Number(lowStockProducts[0]?.count || 0),
    })
  } catch (err) { next(err) }
}

const getDailySales = async (req, res, next) => {
  try {
    const orgId = ORG(req); const days = Number(req.query.days || 7); const results = []
    for (let i = days-1; i >= 0; i--) {
      const date = new Date(); date.setDate(date.getDate()-i)
      const s = new Date(date); s.setHours(0,0,0,0); const e = new Date(date); e.setHours(23,59,59,999)
      const agg = await prisma.order.aggregate({ where: { organizationId: orgId, orderDate: { gte: s, lte: e }, status: { in: ['CONFIRMED','DELIVERED'] } }, _sum: { totalAmount: true }, _count: true })
      results.push({ date: date.toISOString().slice(0,10), revenue: Number(agg._sum.totalAmount||0), orders: agg._count })
    }
    res.json(results)
  } catch (err) { next(err) }
}

const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await prisma.$queryRaw`SELECT * FROM "Product" WHERE "organizationId" = ${ORG(req)} AND "isActive" = true AND stock <= "minStock" ORDER BY stock ASC LIMIT 10`
    res.json(products)
  } catch (err) { next(err) }
}

const getTopShops = async (req, res, next) => {
  try {
    const orgId = ORG(req); const monthS = new Date(); monthS.setDate(1); monthS.setHours(0,0,0,0)
    const shops = await prisma.order.groupBy({ by: ['shopId'], where: { organizationId: orgId, orderDate: { gte: monthS }, status: { in: ['CONFIRMED','DELIVERED'] } }, _sum: { totalAmount: true }, _count: true, orderBy: { _sum: { totalAmount: 'desc' } }, take: 5 })
    const enriched = await Promise.all(shops.map(async s => {
      const shop = await prisma.shop.findUnique({ where: { id: s.shopId }, select: { name: true, type: true } })
      return { ...s, shop, revenue: Number(s._sum.totalAmount||0) }
    }))
    res.json(enriched)
  } catch (err) { next(err) }
}

const getCreditReport = async (req, res, next) => {
  try {
    const shops = await prisma.shop.findMany({ where: { organizationId: ORG(req), isActive: true, balance: { gt: 0 } }, orderBy: { balance: 'desc' }, select: { id:true, name:true, ownerName:true, phone:true, type:true, balance:true, creditLimit:true } })
    res.json(shops)
  } catch (err) { next(err) }
}

module.exports = { getStats, getDailySales, getLowStockProducts, getTopShops, getCreditReport }
