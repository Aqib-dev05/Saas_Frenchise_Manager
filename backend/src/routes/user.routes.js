const router = require('express').Router()
const ctrl = require('../controllers/user.controller')
const { authenticate, authorize } = require('../middleware/auth.middleware')
const { checkLimit } = require('../middleware/subscription.middleware')

router.use(authenticate, authorize('ADMIN'))
router.get('/', ctrl.getUsers)
router.post('/', checkLimit('users'), ctrl.createUser)
router.put('/:id', ctrl.updateUser)
router.delete('/:id', ctrl.deleteUser)

module.exports = router
