const router = require('express').Router()
const ctrl = require('../controllers/product.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const { checkLimit } = require('../middleware/subscription.middleware')

router.use(authenticate)
router.get('/', ctrl.getProducts)
router.get('/low-stock', ctrl.getLowStockProducts)
router.get('/categories', ctrl.getCategories)
router.get('/:id', ctrl.getProductById)
router.post('/', authorize('ADMIN'), checkLimit('products'), ctrl.createProduct)
router.put('/:id', authorize('ADMIN'), ctrl.updateProduct)
router.delete('/:id', authorize('ADMIN'), ctrl.deleteProduct)

module.exports = router
