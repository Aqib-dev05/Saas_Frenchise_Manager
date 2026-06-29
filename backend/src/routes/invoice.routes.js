const router = require('express').Router()
const { downloadInvoicePdf, clearInvoicePdfHistory } = require('../controllers/invoice.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.use(authenticate)
// Admin-only: wipes cached PDF files from Cloudinary (ledger data is untouched).
router.delete('/history', authorize('ADMIN'), clearInvoicePdfHistory)
// Any authenticated role can pull an invoice for an order in their own org —
// salesmen/delivery staff legitimately need to hand a printed copy to a shop.
router.get('/:orderId/pdf', downloadInvoicePdf)

module.exports = router
