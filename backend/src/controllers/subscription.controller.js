const prisma = require('../lib/prisma')

const getPlans = async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json(plans)
  } catch (err) { next(err) }
}

const getSubscription = async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { organizationId: req.user.organizationId },
      include: { plan: true },
    })
    if (!sub) return res.status(404).json({ message: 'No subscription found' })

    // Calculate trial days remaining
    let trialDaysRemaining = null
    if (sub.status === 'TRIALING' && sub.trialEndsAt) {
      const diff = new Date(sub.trialEndsAt) - new Date()
      trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    res.json({ ...sub, trialDaysRemaining })
  } catch (err) { next(err) }
}

// Get Paddle client token for frontend checkout (env var)
const getPaddleConfig = async (req, res, next) => {
  try {
    res.json({
      environment: process.env.PADDLE_ENVIRONMENT || 'sandbox',
      clientToken: process.env.PADDLE_CLIENT_TOKEN || '',
    })
  } catch (err) { next(err) }
}

// Called after Paddle checkout completes (pass transaction ID from frontend)
const activateSubscription = async (req, res, next) => {
  try {
    const { transactionId, planSlug, interval } = req.body
    if (!transactionId || !planSlug) return res.status(400).json({ message: 'transactionId and planSlug required' })

    const plan = await prisma.plan.findUnique({ where: { slug: planSlug } })
    if (!plan) return res.status(404).json({ message: 'Plan not found' })

    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + (interval === 'year' ? 12 : 1))

    const sub = await prisma.subscription.update({
      where: { organizationId: req.user.organizationId },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        paddleTransactionId: transactionId,
        billingInterval: interval || 'month',
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
      },
      include: { plan: true },
    })
    res.json(sub)
  } catch (err) { next(err) }
}

const cancelSubscription = async (req, res, next) => {
  try {
    const sub = await prisma.subscription.update({
      where: { organizationId: req.user.organizationId },
      data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
      include: { plan: true },
    })
    res.json({ ...sub, message: 'Subscription will cancel at end of billing period' })
  } catch (err) { next(err) }
}

module.exports = { getPlans, getSubscription, getPaddleConfig, activateSubscription, cancelSubscription }
