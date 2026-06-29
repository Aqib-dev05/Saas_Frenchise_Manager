const router = require('express').Router()
const upload = require('../middleware/upload.middleware')
const { uploadImage } = require('../controllers/upload.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.use(authenticate)

// Wrap multer so file-size/type errors return a clean 400 instead of a generic 500
const handleUpload = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image must be under 5MB' })
      }
      return res.status(400).json({ message: err.message || 'Upload failed' })
    }
    next()
  })
}

router.post('/image', handleUpload, uploadImage)

module.exports = router
