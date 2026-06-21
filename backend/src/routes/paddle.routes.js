const router = require('express').Router()
const { handleWebhook } = require('../controllers/paddle.controller')

// Paddle sends raw body — must be parsed before JSON middleware
router.post('/webhook', handleWebhook)

module.exports = router
