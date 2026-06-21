const router = require('express').Router()
const { getStats, getDailySales, getLowStockProducts, getTopShops, getCreditReport } = require('../controllers/dashboard.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate, authorize('ADMIN'))
router.get('/stats', getStats)
router.get('/daily-sales', getDailySales)
router.get('/low-stock', getLowStockProducts)
router.get('/top-shops', getTopShops)
router.get('/credit-report', getCreditReport)

module.exports = router
