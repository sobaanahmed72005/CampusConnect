const fs = require('fs')
const path = require('path')

describe('Phase 4 — CI/CD Pipeline Architecture Suite', () => {
  const workflowPath = path.join(__dirname, '../../.github/workflows/ci-cd.yml')

  test('CI/CD workflow file exists in .github/workflows/ci-cd.yml', () => {
    expect(fs.existsSync(workflowPath)).toBe(true)
  })

  test('CI/CD pipeline contains all 6 required automated stages', () => {
    const content = fs.readFileSync(workflowPath, 'utf-8')

    // 1. GitHub Trigger
    expect(content).toContain('on:')
    expect(content).toContain('push:')
    expect(content).toContain('branches: [ main, release ]')

    // 2. Lint / Code Quality
    expect(content).toContain('lint-and-test:')

    // 3. Automated Tests & DB Migrations
    expect(content).toContain('npm run db:migrate')
    expect(content).toContain('npm test')

    // 4. Production Build
    expect(content).toContain('npm run build')

    // 5. Security & Dependency Audit
    expect(content).toContain('npm audit --audit-level=high')

    // 6. Automated Deploy Stage
    expect(content).toContain('deploy:')
    expect(content).toContain('needs: lint-and-test')
  })
})
