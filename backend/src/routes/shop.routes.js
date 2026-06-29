const router = require('express').Router()
const ctrl = require('../controllers/shop.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const { checkLimit } = require('../middleware/subscription.middleware')

router.use(authenticate)
router.get('/', ctrl.getShops)
router.get('/:id', ctrl.getShopById)
router.get('/:id/transactions', ctrl.getShopTransactions)
router.post('/', authorize('ADMIN'), checkLimit('shops'), ctrl.createShop)
router.put('/:id', authorize('ADMIN'), ctrl.updateShop)
router.delete('/:id', authorize('ADMIN'), ctrl.deleteShop)
router.post('/:id/portal/credentials', authorize('ADMIN'), ctrl.generatePortalCredentials)
router.put('/:id/portal/toggle', authorize('ADMIN'), ctrl.togglePortalAccess)

module.exports = router
