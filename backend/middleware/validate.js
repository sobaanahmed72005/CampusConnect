// Centralized Formal Input Validation Architecture Middleware Layer
// Validates Strings, Lengths, UUIDs, Numbers, Dates, Enums, Pagination, Search parameters & Unexpected fields

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(str) {
  return typeof str === 'string' && UUID_V4_REGEX.test(str)
}

function isFastEmail(email) {
  return typeof email === 'string' && email.toLowerCase().trim().endsWith('@nu.edu.pk')
}

function isValidString(val, minLength = 1, maxLength = 255) {
  if (typeof val !== 'string') return false
  const trimmed = val.trim()
  return trimmed.length >= minLength && trimmed.length <= maxLength
}

function isValidNumber(val, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(val)
  return !isNaN(num) && num >= min && num <= max
}

function isValidEnum(val, allowedValues) {
  return Array.isArray(allowedValues) && allowedValues.includes(val)
}

function isValidDate(val) {
  if (!val) return false
  const timestamp = Date.parse(val)
  return !isNaN(timestamp)
}

function sanitizePagination(queryPage, queryLimit) {
  const page = Math.max(1, parseInt(queryPage) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(queryLimit) || 10))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

function findUnexpectedFields(body, allowedFields) {
  if (!body || typeof body !== 'object') return []
  const keys = Object.keys(body)
  return keys.filter(k => !allowedFields.includes(k))
}

// Middleware generator for request payload validation
function validateSchema({ allowedFields = [], requiredFields = [], uuidParams = [], enumRules = {} }) {
  return (req, res, next) => {
    // 1. Validate UUID route parameters
    for (const paramName of uuidParams) {
      const paramVal = req.params[paramName]
      if (paramVal && !isUuid(paramVal)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid UUID identifier format for parameter '${paramName}'.`,
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // 2. Reject unexpected request body fields if allowedFields is specified
    if (allowedFields.length > 0 && req.body && typeof req.body === 'object') {
      const unexpected = findUnexpectedFields(req.body, allowedFields)
      if (unexpected.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Unpermitted fields detected in request payload: ${unexpected.join(', ')}`,
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // 3. Verify required fields presence
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Missing required payload parameter '${field}'.`,
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    // 4. Validate Enum rules
    for (const [field, allowedValues] of Object.entries(enumRules)) {
      if (req.body[field] !== undefined && !isValidEnum(req.body[field], allowedValues)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid value for parameter '${field}'. Permitted options: ${allowedValues.join(', ')}`,
            requestId: req.id,
            timestamp: new Date().toISOString()
          }
        })
      }
    }

    next()
  }
}

module.exports = {
  isUuid,
  isFastEmail,
  isValidString,
  isValidNumber,
  isValidEnum,
  isValidDate,
  sanitizePagination,
  findUnexpectedFields,
  validateSchema
}
