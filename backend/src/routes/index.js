const router = require('express').Router()

router.use('/auth',         require('./auth.routes'))
router.use('/users',        require('./user.routes'))
router.use('/products',     require('./product.routes'))
router.use('/shops',        require('./shop.routes'))
router.use('/routes',       require('./route.routes'))
router.use('/orders',       require('./order.routes'))
router.use('/payments',     require('./payment.routes'))
router.use('/deliveries',   require('./delivery.routes'))
router.use('/dashboard',    require('./dashboard.routes'))
router.use('/organization', require('./organization.routes'))
router.use('/subscription', require('./subscription.routes'))
router.use('/paddle',       require('./paddle.routes'))

module.exports = router
