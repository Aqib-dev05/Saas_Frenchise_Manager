const crypto = require('crypto')
const prisma = require('../lib/prisma')

// Verify Paddle webhook signature
const verifyPaddleSignature = (req) => {
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!secret) return true // skip in dev if not set

  const signature = req.headers['paddle-signature']
  if (!signature) return false

  const parts = Object.fromEntries(signature.split(';').map(p => p.split('=')))
  const ts = parts['ts']
  const h1 = parts['h1']
  if (!ts || !h1) return false

  const signedPayload = `${ts}:${req.rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(h1), Buffer.from(expected))
}

const handleWebhook = async (req, res) => {
  try {
    if (!verifyPaddleSignature(req)) {
      return res.status(401).json({ message: 'Invalid signature' })
    }

    const event = req.body
    const eventType = event.event_type
    const data = event.data

    console.log(`📦 Paddle webhook: ${eventType}`)

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.activated': {
        const paddleSubId = data.id
        const customerId = data.customer_id
        const priceId = data.items?.[0]?.price?.id
        const status = data.status

        // Find plan by paddle price ID
        const plan = await prisma.plan.findFirst({
          where: {
            OR: [
              { paddlePriceIdMonthly: priceId },
              { paddlePriceIdYearly: priceId },
            ],
          },
        })

        if (plan) {
          // Find org by paddle customer ID (stored on previous checkout)
          const sub = await prisma.subscription.findFirst({
            where: { paddleCustomerId: customerId },
          })
          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                paddleSubscriptionId: paddleSubId,
                status: 'ACTIVE',
                planId: plan.id,
                currentPeriodStart: data.current_billing_period?.starts_at ? new Date(data.current_billing_period.starts_at) : new Date(),
                currentPeriodEnd: data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null,
              },
            })
          }
        }
        break
      }

      case 'subscription.updated': {
        const sub = await prisma.subscription.findUnique({ where: { paddleSubscriptionId: data.id } })
        if (sub) {
          const updates = {}
          if (data.status) updates.status = mapPaddleStatus(data.status)
          if (data.current_billing_period?.ends_at) updates.currentPeriodEnd = new Date(data.current_billing_period.ends_at)
          if (data.scheduled_change?.action === 'cancel') updates.cancelAtPeriodEnd = true
          await prisma.subscription.update({ where: { id: sub.id }, data: updates })
        }
        break
      }

      case 'subscription.canceled': {
        const sub = await prisma.subscription.findUnique({ where: { paddleSubscriptionId: data.id } })
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELED', canceledAt: new Date() } })
        }
        break
      }

      case 'subscription.past_due': {
        const sub = await prisma.subscription.findUnique({ where: { paddleSubscriptionId: data.id } })
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } })
        }
        break
      }

      case 'transaction.completed': {
        // Payment received — update subscription period
        if (data.subscription_id) {
          const sub = await prisma.subscription.findUnique({ where: { paddleSubscriptionId: data.subscription_id } })
          if (sub && data.billing_period?.ends_at) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: 'ACTIVE',
                currentPeriodEnd: new Date(data.billing_period.ends_at),
              },
            })
          }
        }
        break
      }

      default:
        console.log(`Unhandled Paddle event: ${eventType}`)
    }

    res.json({ received: true })
  } catch (err) {
    console.error('Paddle webhook error:', err)
    res.status(500).json({ message: 'Webhook processing failed' })
  }
}

const mapPaddleStatus = (paddleStatus) => {
  const map = {
    active: 'ACTIVE',
    trialing: 'TRIALING',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    paused: 'PAUSED',
  }
  return map[paddleStatus] || 'ACTIVE'
}

module.exports = { handleWebhook }
