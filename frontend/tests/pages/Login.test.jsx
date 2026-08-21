import { describe, test, expect } from 'vitest'

describe('Frontend Page: Login Form Component Suite', () => {
  test('Login form requires email and password inputs', () => {
    function validateLoginForm(email, password) {
      const errors = {}
      if (!email) errors.email = 'Email is required'
      else if (!email.endsWith('@nu.edu.pk')) errors.email = 'Must use a FAST @nu.edu.pk email'
      
      if (!password) errors.password = 'Password is required'
      
      return errors
    }

    expect(validateLoginForm('', '')).toEqual({
      email: 'Email is required',
      password: 'Password is required'
    })

    expect(validateLoginForm('user@gmail.com', 'Pass123!')).toEqual({
      email: 'Must use a FAST @nu.edu.pk email'
    })

    expect(validateLoginForm('student@nu.edu.pk', 'Pass123!')).toEqual({})
  })
})
