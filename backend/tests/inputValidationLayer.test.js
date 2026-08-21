const {
  isUuid,
  isFastEmail,
  isValidString,
  isValidNumber,
  isValidEnum,
  isValidDate,
  sanitizePagination,
  findUnexpectedFields
} = require('../middleware/validate')

describe('Formal Input Validation Architecture Layer Test Suite', () => {
  describe('1. UUID v4 Validation', () => {
    test('Valid UUID v4 string passes validation', () => {
      expect(isUuid('a3bb189e-8bf9-3888-9912-ace4e6543002')).toBe(true)
    })

    test('Malformed or SQL injection string in UUID param fails validation', () => {
      expect(isUuid("123-abc'; DROP TABLE users;--")).toBe(false)
      expect(isUuid('invalid-uuid-string')).toBe(false)
    })
  })

  describe('2. FAST Institutional Email Validation', () => {
    test('@nu.edu.pk email addresses pass validation', () => {
      expect(isFastEmail('i210999@nu.edu.pk')).toBe(true)
    })

    test('Non-FAST email addresses fail validation', () => {
      expect(isFastEmail('student@gmail.com')).toBe(false)
      expect(isFastEmail('hacker@outlook.com')).toBe(false)
    })
  })

  describe('3. String, Numeric & Enum Bounds Validation', () => {
    test('String length constraints are enforced', () => {
      expect(isValidString('Textbook', 3, 50)).toBe(true)
      expect(isValidString('A', 3, 50)).toBe(false)
    })

    test('Numeric boundary bounds are enforced', () => {
      expect(isValidNumber(150.00, 0, 10000)).toBe(true)
      expect(isValidNumber(-10, 0, 10000)).toBe(false)
    })

    test('Enum whitelists enforce permitted values', () => {
      const allowedRoles = ['student', 'admin']
      expect(isValidEnum('student', allowedRoles)).toBe(true)
      expect(isValidEnum('superuser', allowedRoles)).toBe(false)
    })

    test('Date validity is verified', () => {
      expect(isValidDate('2026-08-21')).toBe(true)
      expect(isValidDate('not-a-valid-date')).toBe(false)
    })
  })

  describe('4. Pagination Boundaries & Unexpected Field Rejection', () => {
    test('sanitizePagination caps page >= 1 and limit <= 100', () => {
      const result = sanitizePagination(-5, 500)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(100)
      expect(result.offset).toBe(0)
    })

    test('findUnexpectedFields flags unpermitted keys in request body', () => {
      const allowed = ['title', 'price', 'category']
      const body = { title: 'Laptop', price: 500, category: 'Electronics', is_admin: true }
      const unexpected = findUnexpectedFields(body, allowed)

      expect(unexpected).toContain('is_admin')
      expect(unexpected).toHaveLength(1)
    })
  })
})
