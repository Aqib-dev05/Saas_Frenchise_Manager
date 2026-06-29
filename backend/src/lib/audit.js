const prisma = require('./prisma')

// Fields that must never be persisted into an audit log's `changes` JSON,
// no matter which controller's request body they came from.
const SENSITIVE_KEYS = new Set([
  'password', 'newPassword', 'otp',
  'resetOtpHash', 'resetOtpExpiresAt', 'resetOtpAttempts', 'resetOtpRequestedAt',
  'token', 'paddleCustomerId', 'paddleTransactionId',
])

const sanitize = (value) => {
  if (Array.isArray(value)) return value.map(sanitize)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key)) continue
      out[key] = sanitize(val)
    }
    return out
  }
  return value
}

// Fire-and-forget by design — a logging failure (bad JSON, DB hiccup) must
// never surface as an error on the user-facing request it's describing.
async function logAudit({ organizationId, userId, userName, userRole, action, resource, resourceId, description, changes, ipAddress }) {
  if (!organizationId || !action || !resource) return
  try {
    await prisma.auditLog.create({
      data: {
        organizationId,
        userId: userId || null,
        userName: userName || null,
        userRole: userRole || null,
        action,
        resource,
        resourceId: resourceId || null,
        description: description || null,
        changes: changes ? sanitize(changes) : undefined,
        ipAddress: ipAddress || null,
      },
    })
  } catch (err) {
    console.error('Audit log write failed:', err.message)
  }
}

module.exports = { logAudit, sanitize }
