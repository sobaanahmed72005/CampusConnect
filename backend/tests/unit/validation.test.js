const {
  isValidString,
  isUuid,
  isValidNumber,
  isValidEnum,
  sanitizePagination,
  findUnexpectedFields
} = require('../../middleware/validate')

describe('Unit: Input Validation Schema Primitives Suite', () => {
  describe('1. String Validation (isValidString)', () => {
    test('Valid strings within min/max bounds return true', () => {
      expect(isValidString('Valid Title', 3, 50)).toBe(true)
    })

    test('Short strings below min length fail validation', () => {
      expect(isValidString('Hi', 3, 50)).toBe(false)
    })

    test('Long strings exceeding max length fail validation', () => {
      expect(isValidString('A'.repeat(51), 3, 50)).toBe(false)
    })
  })

  describe('2. UUID v4 Format Validation (isUuid)', () => {
    test('Valid UUID v4 strings pass validation', () => {
      expect(isUuid('ccef3fdd-9d90-4121-9804-ab4b5d71e73b')).toBe(true)
    })

    test('Invalid UUID strings fail validation', () => {
      expect(isUuid('invalid-uuid-123')).toBe(false)
      expect(isUuid('12345')).toBe(false)
    })
  })

  describe('3. Numeric & Enum Validation', () => {
    test('Numeric bounds checking rejects negative values when gte 0', () => {
      expect(isValidNumber(150, 0)).toBe(true)
      expect(isValidNumber(-10, 0)).toBe(false)
    })

    test('Enum whitelisting permits allowed values and rejects unlisted values', () => {
      const allowed = ['Electronics', 'Books', 'Housing']
      expect(isValidEnum('Books', allowed)).toBe(true)
      expect(isValidEnum('Weapons', allowed)).toBe(false)
    })
  })

  describe('4. Pagination Sanitization (sanitizePagination)', () => {
    test('Default pagination falls back to page=1 and limit=10', () => {
      const res = sanitizePagination(undefined, undefined)
      expect(res.page).toBe(1)
      expect(res.limit).toBe(10)
      expect(res.offset).toBe(0)
    })

    test('Pagination caps limit at maximum 100', () => {
      const res = sanitizePagination(1, 500)
      expect(res.limit).toBe(100)
    })
  })

  describe('5. Unexpected Payload Field Rejection (findUnexpectedFields)', () => {
    test('Identifies unpermitted unexpected request body fields', () => {
      const payload = { title: 'Book', price: 100, maliciousField: 'hack' }
      const allowed = ['title', 'price']
      const unexpected = findUnexpectedFields(payload, allowed)

      expect(unexpected).toContain('maliciousField')
      expect(unexpected).not.toContain('title')
    })
  })
})
