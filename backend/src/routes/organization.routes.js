const router = require('express').Router()
const { getOrganization, updateOrganization } = require('../controllers/organization.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate)
router.get('/', getOrganization)
router.put('/', authorize('ADMIN'), updateOrganization)

module.exports = router
