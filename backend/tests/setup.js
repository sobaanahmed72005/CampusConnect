// Jest / Vitest Test Environment Setup
// Sets up isolated environment variables for testing execution

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test_jwt_secret_256bit_key_for_testing'
process.env.DB_HOST = process.env.DB_HOST || 'localhost'
process.env.DB_PORT = process.env.DB_PORT || '5432'
process.env.DB_NAME = process.env.DB_NAME || 'campusconnect_test'
process.env.DB_USER = process.env.DB_USER || 'campusconnect_test'
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'test_password'
process.env.FRONTEND_URL = 'http://localhost:5173'

// Suppress console logs during clean test runs
if (!process.env.DEBUG_TESTS) {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
}
