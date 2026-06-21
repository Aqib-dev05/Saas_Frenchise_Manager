const prisma = require('../lib/prisma')

// Checks subscription is active; blocks if expired/canceled
const requireActiveSubscription = async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user.organizationId },
      include: { plan: true }
    })
    if (!sub) return res.status(402).json({ message: 'No subscription found. Please subscribe to continue.', code: 'NO_SUBSCRIPTION' })
    if (sub.status === 'TRIALING' && sub.trialEndsAt && new Date() > sub.trialEndsAt) {
      return res.status(402).json({ message: 'Trial expired. Please upgrade.', code: 'TRIAL_EXPIRED' })
    }
    if (['CANCELED', 'PAST_DUE'].includes(sub.status)) {
      return res.status(402).json({ message: 'Subscription inactive. Please renew.', code: 'SUBSCRIPTION_INACTIVE' })
    }
    req.subscription = sub
    req.plan = sub.plan
    next()
  } catch (err) { next(err) }
}

// Factory: check a specific resource limit before create
const checkLimit = (resource) => async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user.organizationId },
      include: { plan: true }
    })
    if (!sub) return next()
    const plan = sub.plan
    const limits = { users: plan.maxUsers, routes: plan.maxRoutes, products: plan.maxProducts, shops: plan.maxShops }
    const limit = limits[resource]
    if (limit === -1) return next() // unlimited

    const countMap = {
      users:    () => prisma.user.count({ where: { organizationId: req.user.organizationId, isActive: true } }),
      routes:   () => prisma.route.count({ where: { organizationId: req.user.organizationId, isActive: true } }),
      products: () => prisma.product.count({ where: { organizationId: req.user.organizationId, isActive: true } }),
      shops:    () => prisma.shop.count({ where: { organizationId: req.user.organizationId, isActive: true } }),
    }

    const count = await countMap[resource]()
    if (count >= limit) {
      return res.status(403).json({
        message: `Plan limit reached: ${resource} (${count}/${limit}). Upgrade your plan to add more.`,
        code: 'PLAN_LIMIT_REACHED', resource, current: count, limit
      })
    }
    next()
  } catch (err) { next(err) }
}

module.exports = { requireActiveSubscription, checkLimit }
