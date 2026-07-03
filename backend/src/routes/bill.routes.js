const router = require('express').Router()
const { downloadOrderBill } = require('../controllers/bill.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.use(authenticate)

// GET /api/bills/:orderId — works on ANY order status (PENDING onward)
// Salesman: own orders only (enforced in controller)
// Admin + Delivery: any order in the org
router.get('/:orderId', downloadOrderBill)

module.exports = router
