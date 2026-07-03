const router = require('express').Router()
const ctrl = require('../controllers/skippedVisit.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.use(authenticate)

// Any staff role can read skips (salesman sees own, admin sees all — enforced in controller)
router.get('/', ctrl.getSkips)

// Only Salesman creates skips (they're on the route — admin/delivery don't visit shops)
router.post('/', ctrl.createSkip)

// Admin or the creating salesman can resolve
router.put('/:id/resolve', ctrl.resolveSkip)

module.exports = router
