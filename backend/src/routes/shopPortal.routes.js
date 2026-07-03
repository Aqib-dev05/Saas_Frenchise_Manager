const router = require('express').Router()
const { login, getMe, getOrders, getOrderById, getPayments, getLedger } = require('../controllers/shopPortal.controller')
const { downloadInvoicePdfForShop } = require('../controllers/invoice.controller')
const { downloadBillForShop } = require('../controllers/bill.controller')
const { authenticateShopPortal } = require('../middleware/shopPortal.middleware')

router.post('/login', login)

router.use(authenticateShopPortal)
router.get('/me', getMe)
router.get('/orders', getOrders)
router.get('/orders/:id', getOrderById)
router.get('/payments', getPayments)
router.get('/ledger', getLedger)
router.get('/invoices/:orderId/pdf', downloadInvoicePdfForShop)
// Bill: works on any order status — shop owner can get a receipt even before delivery
router.get('/bills/:orderId', downloadBillForShop)

module.exports = router
