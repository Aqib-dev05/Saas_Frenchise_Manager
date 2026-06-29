const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')
const { sendOtpEmail } = require('../lib/mailer')
const { logAudit } = require('../lib/audit')

const generateToken = (user) => jwt.sign(
  { userId: user.id, role: user.role, organizationId: user.organizationId, name: user.name },
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
    logAudit({
      organizationId: user.organizationId, userId: user.id, userName: user.name, userRole: user.role,
      action: 'LOGIN', resource: 'Auth', resourceId: user.id, description: `${user.name} logged in`,
      ipAddress: req.ip,
    })
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
    logAudit({
      organizationId: org.id, userId: newUser.id, userName: newUser.name, userRole: newUser.role,
      action: 'REGISTER', resource: 'Organization', resourceId: org.id,
      description: `${newUser.name} registered organization "${org.name}"`,
      ipAddress: req.ip,
    })
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

const OTP_EXPIRY_MINUTES = 10
const OTP_RESEND_COOLDOWN_SECONDS = 60
const OTP_MAX_ATTEMPTS = 5

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000)) // 6 digits

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required' })

    // Always return the same generic message whether or not the account
    // exists — prevents attackers from using this endpoint to discover
    // which emails are registered.
    const genericResponse = { message: 'If an account exists for that email, a reset code has been sent.' }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.isActive) return res.json(genericResponse)

    // Cooldown — don't let someone spam the email/SMTP provider with requests
    if (user.resetOtpRequestedAt) {
      const secondsSinceLast = (Date.now() - new Date(user.resetOtpRequestedAt).getTime()) / 1000
      if (secondsSinceLast < OTP_RESEND_COOLDOWN_SECONDS) {
        return res.status(429).json({ message: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLast)}s before requesting another code.` })
      }
    }

    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, 10)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetOtpHash: otpHash, resetOtpExpiresAt: expiresAt, resetOtpAttempts: 0, resetOtpRequestedAt: new Date() },
    })

    await sendOtpEmail(user.email, otp, user.name)
    res.json(genericResponse)
  } catch (err) { next(err) }
}

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Email, code and new password are required' })
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' })

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return res.status(400).json({ message: 'Invalid or expired code. Please request a new one.' })
    }
    if (new Date() > new Date(user.resetOtpExpiresAt)) {
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' })
    }
    if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' })
    }

    const matches = await bcrypt.compare(otp, user.resetOtpHash)
    if (!matches) {
      await prisma.user.update({ where: { id: user.id }, data: { resetOtpAttempts: { increment: 1 } } })
      const remaining = OTP_MAX_ATTEMPTS - (user.resetOtpAttempts + 1)
      return res.status(400).json({ message: remaining > 0 ? `Incorrect code. ${remaining} attempt(s) remaining.` : 'Incorrect code. Please request a new one.' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        resetOtpHash: null, resetOtpExpiresAt: null, resetOtpAttempts: 0, resetOtpRequestedAt: null,
      },
    })

    logAudit({
      organizationId: user.organizationId, userId: user.id, userName: user.name, userRole: user.role,
      action: 'PASSWORD_RESET', resource: 'Auth', resourceId: user.id, description: `${user.name} reset their password via OTP`,
      ipAddress: req.ip,
    })

    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) { next(err) }
}

module.exports = { login, register, getMe, forgotPassword, resetPassword }
