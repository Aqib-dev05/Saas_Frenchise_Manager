const router = require('express').Router()
const ctrl = require('../controllers/subscription.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')

router.get('/plans', ctrl.getPlans)
router.use(authenticate)
router.get('/', ctrl.getSubscription)
router.get('/paddle-config', ctrl.getPaddleConfig)
router.post('/activate', authorize('ADMIN'), ctrl.activateSubscription)
router.post('/cancel', authorize('ADMIN'), ctrl.cancelSubscription)

module.exports = router
