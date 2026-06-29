const { logAudit } = require('../lib/audit')

// URL collection segment -> human label. Anything missing here just falls
// back to the raw segment, so a brand-new route is still logged (with a
// slightly blunter label) without needing an edit here.
const RESOURCE_LABELS = {
  products: 'Product', shops: 'Shop', routes: 'Route', orders: 'Order',
  payments: 'Payment', deliveries: 'Delivery', users: 'User',
  organization: 'Organization', subscription: 'Subscription', invoices: 'Invoice',
}

const ACTION_BY_METHOD = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' }

const VERB_BY_ACTION = { CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', STATUS_CHANGE: 'Changed status of' }

// Webhooks and read-only/asset routes aren't user-initiated data mutations
// worth a log row. The invoice PDF GET is excluded by the method check
// already (GET); listed here only for clarity on raw uploads/webhooks.
const SKIP_PREFIXES = ['/api/paddle', '/api/upload']

// A handful of nested/non-CRUD routes read better with a bespoke
// description than the generic "Updated Route" the fallback would produce.
const DESC_RULES = [
  { test: /\/orders\/[^/]+\/status$/, resource: 'Order', action: 'STATUS_CHANGE', desc: (req) => `Order status changed to ${req.body?.status || '?'}` },
  { test: /\/deliveries\/[^/]+\/status$/, resource: 'Delivery', action: 'STATUS_CHANGE', desc: (req) => `Delivery status changed to ${req.body?.status || '?'}` },
  { test: /\/routes\/[^/]+\/shops$/, resource: 'Route', action: 'UPDATE', desc: () => 'Shop added to route' },
  { test: /\/routes\/[^/]+\/shops\/[^/]+$/, resource: 'Route', action: 'UPDATE', desc: () => 'Shop removed from route' },
  { test: /\/routes\/[^/]+\/reorder$/, resource: 'Route', action: 'UPDATE', desc: () => 'Route shop sequence reordered' },
  { test: /\/subscription\/activate$/, resource: 'Subscription', action: 'UPDATE', desc: () => 'Subscription activated' },
  { test: /\/subscription\/cancel$/, resource: 'Subscription', action: 'UPDATE', desc: () => 'Subscription cancelled' },
  { test: /\/invoices\/history$/, resource: 'Invoice', action: 'DELETE', desc: () => 'Cleared cached invoice PDFs' },
  { test: /\/shops\/[^/]+\/portal\/credentials$/, resource: 'Shop', action: 'UPDATE', desc: () => 'Generated/rotated shop portal credentials' },
  { test: /\/shops\/[^/]+\/portal\/toggle$/, resource: 'Shop', action: 'UPDATE', desc: (req) => `Shop portal access ${req.body?.enabled ? 'enabled' : 'disabled'}` },
]

const buildEntry = (req, path, capturedBody) => {
  for (const rule of DESC_RULES) {
    if (rule.test.test(path)) return { resource: rule.resource, action: rule.action, description: rule.desc(req, capturedBody) }
  }
  const segments = path.split('/').filter(Boolean) // ['api','products',':id',...]
  const resource = RESOURCE_LABELS[segments[1]] || segments[1] || 'Unknown'
  const action = ACTION_BY_METHOD[req.method] || req.method
  const nameHint = req.body?.name || req.body?.orderNo || req.body?.invoiceNo
    || capturedBody?.name || capturedBody?.orderNo || capturedBody?.invoiceNo
  const description = `${VERB_BY_ACTION[action] || action} ${resource}${nameHint ? ` — ${nameHint}` : ''}`
  return { resource, action, description }
}

function auditMiddleware(req, res, next) {
  if (req.method === 'GET' || SKIP_PREFIXES.some((p) => req.originalUrl.startsWith(p))) return next()

  let capturedBody = null
  const originalJson = res.json.bind(res)
  res.json = (body) => { capturedBody = body; return originalJson(body) }

  res.on('finish', () => {
    // Unauthenticated routes (login/register/password-reset) have no
    // req.user — those log themselves explicitly from auth.controller.js,
    // since that's the only place that knows which account is involved.
    if (!req.user) return
    if (res.statusCode < 200 || res.statusCode >= 300) return

    const path = req.originalUrl.split('?')[0]
    const { resource, action, description } = buildEntry(req, path, capturedBody)
    const resourceId = Object.values(req.params || {})[0] || capturedBody?.id || null

    logAudit({
      organizationId: req.user.organizationId,
      userId: req.user.userId,
      userName: req.user.name,
      userRole: req.user.role,
      action, resource, resourceId, description,
      changes: req.body,
      ipAddress: req.ip,
    })
  })

  next()
}

module.exports = auditMiddleware
