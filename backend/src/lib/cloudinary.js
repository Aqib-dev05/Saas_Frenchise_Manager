const cloudinaryV2 = require('cloudinary').v2

cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// Cloudinary delivery URLs (without baked-in transformations) look like:
//   https://res.cloudinary.com/<cloud>/image/upload/v1699999999/folder/sub/abc123.jpg
// The public_id is everything after the version segment, minus the file extension.
function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const afterUpload = url.split('/upload/')[1]
    if (!afterUpload) return null
    const withoutVersion = afterUpload.replace(/^v\d+\//, '')
    const withoutExt = withoutVersion.replace(/\.[a-zA-Z0-9]+($|\?.*$)/, '')
    return withoutExt || null
  } catch {
    return null
  }
}

// Best-effort delete — never throws. Cleaning up an old/unused image should
// never block or fail the database operation it's attached to.
async function destroy(publicId, resourceType = 'image') {
  if (!publicId) return
  try {
    await cloudinaryV2.uploader.destroy(publicId, { resource_type: resourceType })
  } catch (err) {
    console.error('Cloudinary delete failed for', publicId, '-', err.message)
  }
}

async function deleteByUrl(url, resourceType = 'image') {
  return destroy(extractPublicId(url), resourceType)
}

async function deleteManyByUrls(urls = [], resourceType = 'image') {
  await Promise.all(urls.filter(Boolean).map((u) => deleteByUrl(u, resourceType)))
}

// PDFs (and any non-image file) must be uploaded/deleted as resource_type
// 'raw' — Cloudinary's image pipeline (transformations, image-only routes)
// doesn't apply to them, and `destroy()` will silently no-op on the wrong
// resource_type instead of erroring, so callers must be explicit.
async function uploadRawBuffer(buffer, { folder, publicId, format = 'pdf' } = {}) {
  return cloudinaryV2.uploader.upload(`data:application/pdf;base64,${buffer.toString('base64')}`, {
    folder,
    public_id: publicId,
    resource_type: 'raw',
    format,
    overwrite: true,
  })
}

module.exports = {
  cloudinary: cloudinaryV2,
  extractPublicId,
  destroy,
  deleteByUrl,
  deleteManyByUrls,
  uploadRawBuffer,
}
