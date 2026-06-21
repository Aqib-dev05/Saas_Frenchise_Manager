const router = require('express').Router()
const { getDeliveries, updateDeliveryStatus } = require('../controllers/delivery.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.use(authenticate)
router.get('/', getDeliveries)
router.put('/:id/status', updateDeliveryStatus)

module.exports = router
