const router = require('express').Router()
const { getOrders, getTodayOrders, getOrderById, createOrder, updateOrderStatus, updateOrder } = require('../controllers/order.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate)
router.get('/', getOrders)
router.get('/today', getTodayOrders)
router.get('/:id', getOrderById)
router.post('/', authorize('ADMIN', 'SALESMAN'), createOrder)
router.put('/:id', authorize('ADMIN', 'SALESMAN'), updateOrder)
router.put('/:id/status', updateOrderStatus)

module.exports = router
