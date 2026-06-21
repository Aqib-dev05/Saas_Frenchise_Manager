const router = require('express').Router()
const ctrl = require('../controllers/route.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const { checkLimit } = require('../middleware/subscription.middleware')

router.use(authenticate)
router.get('/', ctrl.getRoutes)
router.get('/today', ctrl.getTodayRoute)
router.get('/:id', ctrl.getRouteById)
router.post('/', authorize('ADMIN'), checkLimit('routes'), ctrl.createRoute)
router.put('/:id', authorize('ADMIN'), ctrl.updateRoute)
router.delete('/:id', authorize('ADMIN'), ctrl.deleteRoute)
router.post('/:routeId/shops', authorize('ADMIN'), ctrl.addShopToRoute)
router.delete('/:routeId/shops/:shopId', authorize('ADMIN'), ctrl.removeShopFromRoute)
router.put('/:routeId/reorder', authorize('ADMIN'), ctrl.reorderRouteShops)

module.exports = router
