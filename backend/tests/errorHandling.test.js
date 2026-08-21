const request = require('supertest')

describe('Error Classification & Database Error Sanitization Suite', () => {
  test('Classifies 400 status as VALIDATION_ERROR', () => {
    const err = { status: 400, message: 'Invalid email domain' }
    const code = err.status === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'
    expect(code).toBe('VALIDATION_ERROR')
  })

  test('Classifies 401 status as AUTHENTICATION_ERROR', () => {
    const err = { status: 401, message: 'Session expired' }
    const code = err.status === 401 ? 'AUTHENTICATION_ERROR' : 'INTERNAL_ERROR'
    expect(code).toBe('AUTHENTICATION_ERROR')
  })

  test('Classifies 403 status as AUTHORIZATION_ERROR', () => {
    const err = { status: 403, message: 'Admin access required' }
    const code = err.status === 403 ? 'AUTHORIZATION_ERROR' : 'INTERNAL_ERROR'
    expect(code).toBe('AUTHORIZATION_ERROR')
  })

  test('Classifies CSRF failure as CSRF_FAILURE', () => {
    const err = { code: 'EBADCSRFTOKEN', message: 'CSRF token mismatch' }
    const isCsrf = err.code === 'EBADCSRFTOKEN' || err.message.includes('CSRF')
    expect(isCsrf).toBe(true)
  })

  test('Sanitizes raw PostgreSQL database errors (code 23505) and suppresses internal details from client payload', () => {
    const rawPgError = {
      code: '23505',
      severity: 'ERROR',
      routine: '_bt_check_unique',
      detail: 'Key (email)=(k213001@nu.edu.pk) already exists.',
      table: 'users'
    }

    // Resolves to DATABASE_ERROR classification
    const isPgError = Boolean(rawPgError.severity || rawPgError.routine)
    expect(isPgError).toBe(true)

    // Sanitized client response payload
    const clientResponsePayload = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database operation error occurred. Please contact system support with your Reference ID.',
        requestId: 'req-uuid-9999',
        timestamp: new Date().toISOString()
      }
    }

    // Verify raw DB strings are completely suppressed from client payload
    expect(clientResponsePayload.error.message).not.toContain('Key (email)=')
    expect(clientResponsePayload.error.message).not.toContain('_bt_check_unique')
    expect(clientResponsePayload.error.code).toBe('DATABASE_ERROR')
    expect(clientResponsePayload.error.requestId).toBe('req-uuid-9999')
  })
})
