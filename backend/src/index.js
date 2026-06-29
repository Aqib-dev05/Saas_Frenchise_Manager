require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const compression = require('compression')

const routes = require('./routes')

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }))
app.use(compression()) // gzip every JSON response — free bandwidth/speed win
app.use(morgan('dev'))

// Capture raw body for Paddle webhook signature verification
app.use('/api/paddle/webhook', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString()
  req.body = JSON.parse(req.rawBody)
  next()
})

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(require('./middleware/audit.middleware'))

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }))
app.use('/api', routes)

app.use((req, res) => res.status(404).json({ message: `${req.method} ${req.url} not found` }))
app.use((err, req, res, next) => {
  console.error('Error:', err.message)
  if (err.code === 'P2025') return res.status(404).json({ message: 'Record not found' })
  if (err.code === 'P2002') return res.status(400).json({ message: 'Duplicate entry' })
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Franchise Manager API  →  http://localhost:${PORT}`)
  console.log(`💳 Paddle webhooks       →  /api/paddle/webhook`)
})

module.exports = app
