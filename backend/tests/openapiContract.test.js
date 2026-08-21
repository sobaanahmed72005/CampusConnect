const fs = require('fs')
const path = require('path')

describe('OpenAPI 3.0.3 API Contract Automated Validation', () => {
  let openapiSpec

  beforeAll(() => {
    const specPath = path.join(__dirname, '..', 'openapi.json')
    expect(fs.existsSync(specPath)).toBe(true)
    const rawData = fs.readFileSync(specPath, 'utf8')
    openapiSpec = JSON.parse(rawData)
  })

  test('OpenAPI Specification metadata structure is valid', () => {
    expect(openapiSpec.openapi).toBe('3.0.3')
    expect(openapiSpec.info.title).toContain('CampusConnect REST API Specification')
    expect(openapiSpec.info.version).toBe('1.0.0')
  })

  test('OpenAPI spec contains all mandatory system health and readiness paths', () => {
    expect(openapiSpec.paths['/health/live']).toBeDefined()
    expect(openapiSpec.paths['/health/ready']).toBeDefined()
  })

  test('OpenAPI spec defines security-critical endpoints', () => {
    expect(openapiSpec.paths['/auth/login']).toBeDefined()
    expect(openapiSpec.paths['/auth/register']).toBeDefined()
    expect(openapiSpec.paths['/auth/csrf-token']).toBeDefined()
    expect(openapiSpec.paths['/events/{id}/register']).toBeDefined()
    expect(openapiSpec.paths['/marketplace/{id}/sold']).toBeDefined()
    expect(openapiSpec.paths['/lost-found/{id}/matches']).toBeDefined()
    expect(openapiSpec.paths['/admin/users/{id}/status']).toBeDefined()
  })

  test('OpenAPI spec documents ACID transaction and row locking mechanics on event registration', () => {
    const eventRegPath = openapiSpec.paths['/events/{id}/register'].post
    expect(eventRegPath.description).toContain('SELECT FOR UPDATE')
    expect(eventRegPath.responses['400']).toBeDefined()
  })
})
