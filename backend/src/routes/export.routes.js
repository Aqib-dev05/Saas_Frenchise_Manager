const router = require('express').Router()
const {
  exportProducts, exportUsers, exportShops, exportCreditReport,
  exportPayments, exportOrders, exportDailySales, exportMonthlySales, exportProductSalesRatio,
} = require('../controllers/export.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate, authorize('ADMIN'))

router.get('/products', exportProducts)
router.get('/users', exportUsers)
router.get('/shops', exportShops)
router.get('/credit-report', exportCreditReport)
router.get('/payments', exportPayments)
router.get('/orders', exportOrders)
router.get('/daily-sales', exportDailySales)
router.get('/monthly-sales', exportMonthlySales)
router.get('/product-sales-ratio', exportProductSalesRatio)

module.exports = router
