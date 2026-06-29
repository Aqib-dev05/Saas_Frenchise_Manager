const { cloudinary } = require('../lib/cloudinary')

const ALLOWED_FOLDERS = ['avatars', 'shops', 'products', 'general']

const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    let folder = req.body.folder || 'general'
    if (!ALLOWED_FOLDERS.includes(folder)) folder = 'general'

    const orgId = req.user.organizationId
    const b64 = req.file.buffer.toString('base64')
    const dataUri = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `franchise-manager/${orgId}/${folder}`,
      resource_type: 'image',
      // Only cap dimensions at upload time (reduces storage for huge photos).
      // Quality/format (q_auto, f_auto) are intentionally NOT baked in here —
      // they're applied at delivery time per-viewer (see optimizedImageUrl on
      // the frontend) so each browser gets the best format (WebP/AVIF/JPEG)
      // automatically without permanently locking the stored asset to one format.
      transformation: [{ width: 1000, height: 1000, crop: 'limit' }],
    })

    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadImage }
