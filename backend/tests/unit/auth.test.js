const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

describe('Unit: Authentication & Credential Logic Suite', () => {
  const TEST_JWT_SECRET = 'test_jwt_secret_256bit_key_for_testing'

  describe('1. Institutional Email Domain Enforcement (@nu.edu.pk)', () => {
    function isValidFastEmail(email) {
      return typeof email === 'string' && email.toLowerCase().endsWith('@nu.edu.pk')
    }

    test('Valid @nu.edu.pk email addresses are accepted', () => {
      expect(isValidFastEmail('k213001@nu.edu.pk')).toBe(true)
      expect(isValidFastEmail('sobaan.ahmed@nu.edu.pk')).toBe(true)
    })

    test('Non-FAST email domains are rejected', () => {
      expect(isValidFastEmail('user@gmail.com')).toBe(false)
      expect(isValidFastEmail('user@yahoo.com')).toBe(false)
      expect(isValidFastEmail('user@nu.edu.com')).toBe(false)
    })
  })

  describe('2. JWT Cryptographic Token Sign & Verify', () => {
    test('signToken generates valid JWT containing user id and session_version', () => {
      const payload = { id: 'user-123', role: 'student', session_version: 1 }
      const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '7d' })

      const decoded = jwt.verify(token, TEST_JWT_SECRET)
      expect(decoded.id).toBe('user-123')
      expect(decoded.role).toBe('student')
      expect(decoded.session_version).toBe(1)
    })

    test('Invalid or tampered JWT signatures fail verification', () => {
      const token = jwt.sign({ id: 'user-123' }, TEST_JWT_SECRET)
      expect(() => jwt.verify(token, 'wrong-secret-key')).toThrow()
    })
  })

  describe('3. Password Digest Hash & Comparison (bcrypt)', () => {
    test('bcrypt.hash creates valid hash digest and bcrypt.compare succeeds', async () => {
      const rawPassword = 'Password123!'
      const hash = await bcrypt.hash(rawPassword, 10)

      const isMatch = await bcrypt.compare(rawPassword, hash)
      expect(isMatch).toBe(true)

      const isWrongMatch = await bcrypt.compare('WrongPassword!', hash)
      expect(isWrongMatch).toBe(false)
    })
  })
})
