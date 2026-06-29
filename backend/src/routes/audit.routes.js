const router = require('express').Router()
const { getAuditLogs, getAuditLogFilters } = require('../controllers/audit.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate, authorize('ADMIN'))
router.get('/', getAuditLogs)
router.get('/filters', getAuditLogFilters)

module.exports = router
