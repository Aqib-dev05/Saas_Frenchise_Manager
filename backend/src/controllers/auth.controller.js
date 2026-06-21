const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

const generateToken = (user) => jwt.sign(
  { userId: user.id, role: user.role, organizationId: user.organizationId },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
)

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' })

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: {
          include: { subscription: { include: { plan: true } } }
        }
      }
    })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    if (!(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' })
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated. Contact your admin.' })
    if (!user.organization.isActive) return res.status(403).json({ message: 'Organization account is suspended.' })

    const sub = user.organization.subscription
    // Check trial expiry
    if (sub?.status === 'TRIALING' && sub?.trialEndsAt && new Date() > sub.trialEndsAt) {
      return res.status(402).json({ message: 'Trial expired. Please upgrade to continue.', code: 'TRIAL_EXPIRED' })
    }
    if (sub?.status === 'CANCELED') {
      return res.status(402).json({ message: 'Subscription cancelled. Please renew to continue.', code: 'SUBSCRIPTION_CANCELED' })
    }

    const token = generateToken(user)
    const { password: _, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) { next(err) }
}

const register = async (req, res, next) => {
  try {
    const { orgName, adminName, email, password, phone } = req.body
    if (!orgName || !adminName || !email || !password) {
      return res.status(400).json({ message: 'Organization name, your name, email and password are required' })
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (exists) return res.status(400).json({ message: 'Email already registered' })

    // Generate org slug
    const baseSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    let slug = baseSlug
    let counter = 1
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`
    }

    const starterPlan = await prisma.plan.findUnique({ where: { slug: 'professional' } })

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 14)

    const org = await prisma.organization.create({
      data: {
        name: orgName, slug, email: email.toLowerCase(), phone: phone || null,
        users: {
          create: {
            name: adminName, email: email.toLowerCase(),
            password: await bcrypt.hash(password, 10),
            role: 'ADMIN', phone: phone || null,
          }
        },
        subscription: {
          create: {
            planId: starterPlan.id,
            status: 'TRIALING',
            trialEndsAt: trialEnd,
          }
        }
      },
      include: {
        users: true,
        subscription: { include: { plan: true } }
      }
    })

    const newUser = org.users[0]
    const token = generateToken({ ...newUser, organizationId: org.id })
    const { password: _, ...safeUser } = newUser
    res.status(201).json({ token, user: { ...safeUser, organization: org, organizationId: org.id } })
  } catch (err) { next(err) }
}

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        organization: { include: { subscription: { include: { plan: true } } } }
      }
    })
    if (!user) return res.status(404).json({ message: 'User not found' })
    const { password: _, ...safe } = user
    res.json(safe)
  } catch (err) { next(err) }
}

module.exports = { login, register, getMe }
