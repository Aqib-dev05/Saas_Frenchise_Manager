const router = require('express').Router()
const { getPayments, createPayment, getShopPayments } = require('../controllers/payment.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate)
router.get('/', getPayments)
router.post('/', authorize('ADMIN', 'DELIVERY'), createPayment)
router.get('/shop/:id', getShopPayments)

module.exports = router
