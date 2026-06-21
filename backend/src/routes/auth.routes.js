const router = require('express').Router()
const { login, register, getMe } = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/login', login)
router.post('/register', register)
router.get('/me', authenticate, getMe)

module.exports = router
