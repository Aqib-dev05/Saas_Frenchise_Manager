const router = require('express').Router()
const { login, register, getMe, forgotPassword, resetPassword } = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/login', login)
router.post('/register', register)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.get('/me', authenticate, getMe)

module.exports = router
