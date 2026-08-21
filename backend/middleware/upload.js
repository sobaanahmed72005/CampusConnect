const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

// Whitelisted image extensions (SVG explicitly excluded due to embedded XSS script risk)
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

// Executable / dangerous extension blocklist
const DANGEROUS_EXTENSIONS = new Set(['.php', '.phtml', '.exe', '.sh', '.js', '.html', '.htm', '.svg', '.bat', '.cmd', '.pl', '.py', '.rb'])

// Magic Byte Signatures for Image Binaries
const MAGIC_BYTES = [
  { name: 'jpeg', extension: ['.jpg', '.jpeg'], match: (buf) => buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF },
  { name: 'png', extension: ['.png'], match: (buf) => buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 },
  { name: 'gif', extension: ['.gif'], match: (buf) => buf.length >= 3 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 },
  { name: 'webp', extension: ['.webp'], match: (buf) => buf.length >= 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP' }
]

const uploadDir = path.join(__dirname, '..', 'uploads', 'marketplace')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : '.jpg'
    cb(null, `${uuidv4()}${safeExt}`)
  }
})

const multerUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (DANGEROUS_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error('Invalid file extension. Only JPG, PNG, GIF, and WebP images are allowed.'))
    }
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('MIME type validation failed. Only images are allowed.'))
    }
    cb(null, true)
  }
})

// Magic Byte Binary Inspection Middleware
const validateImageBinary = async (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : [])
  if (files.length === 0) return next()

  for (const file of files) {
    try {
      const buffer = Buffer.alloc(16)
      const fd = fs.openSync(file.path, 'r')
      fs.readSync(fd, buffer, 0, 16, 0)
      fs.closeSync(fd)

      // Verify binary magic header against known signatures
      const isValidImage = MAGIC_BYTES.some(sig => sig.match(buffer))

      if (!isValidImage) {
        // Cleanup malicious or corrupted file from disk immediately
        fs.unlinkSync(file.path)
        return res.status(400).json({
          message: 'Security validation failed: File binary header does not match a valid image format.'
        })
      }
    } catch (err) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path)
      return res.status(400).json({ message: 'File validation error.' })
    }
  }

  next()
}

// Cleanup Helper for Orphaned Files on Failed Database Insertions
const deleteFiles = (filePaths) => {
  if (!filePaths || !Array.isArray(filePaths)) return
  for (const fp of filePaths) {
    try {
      const fullPath = path.isAbsolute(fp) ? fp : path.join(__dirname, '..', fp)
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
    } catch (e) {
      console.error('Failed to cleanup file:', fp)
    }
  }
}

module.exports = {
  uploadSingle: (fieldName) => [multerUpload.single(fieldName), validateImageBinary],
  uploadArray: (fieldName, maxCount = 4) => [multerUpload.array(fieldName, maxCount), validateImageBinary],
  deleteFiles
}
