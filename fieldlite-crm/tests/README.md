# FieldLite CRM - Test Suite

Comprehensive test suite for FieldLite CRM, focusing on security, functionality, and integration testing.

## Test Structure

```
tests/
├── unit/                     # Unit tests for individual components
│   ├── webhook-validator.test.ts
│   └── rate-limiter.test.ts
├── integration/              # API endpoint integration tests
│   └── api-security.test.ts
├── communications.spec.ts    # E2E tests for communications hub
└── README.md
```

## Test Types

### Unit Tests

Test individual functions and modules in isolation.

**Location:** `tests/unit/`

**Coverage:**
- Webhook signature validation (Twilio, Resend, SendGrid)
- Rate limiting logic
- Input sanitization
- Security edge cases

**Run:**
```bash
npm run test:unit
```

### Integration Tests

Test API endpoints with real HTTP requests.

**Location:** `tests/integration/`

**Coverage:**
- SMS send/receive endpoints
- Voice recording webhooks
- Rate limiting enforcement
- SQL injection prevention
- Authentication/authorization
- Multi-tenant isolation

**Run:**
```bash
npm run test:integration
```

### E2E Tests

Test complete user workflows in the browser.

**Location:** `tests/*.spec.ts`

**Coverage:**
- Communications hub UI
- Message sending workflow
- Call tracking
- Contact management

**Run:**
```bash
npm run test
npm run test:ui    # Interactive UI mode
npm run test:debug # Debug mode
```

## Setup

### Prerequisites

1. **Node.js 20+** and npm
2. **Redis** for rate limiting tests (via Upstash or local)
3. **Supabase** instance for integration tests
4. **Test Twilio account** (optional, for webhook tests)

### Environment Variables

Create a `.env.test` file:

```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Authentication
TEST_AUTH_TOKEN=your_test_jwt_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio (for webhook validation tests)
TWILIO_AUTH_TOKEN=your_test_auth_token

# Redis (for rate limiting tests)
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

### Install Dependencies

```bash
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Files

```bash
# Unit tests only
npx playwright test tests/unit/

# Integration tests only
npx playwright test tests/integration/

# Single test file
npx playwright test tests/unit/webhook-validator.test.ts
```

### Run Tests in UI Mode

Interactive mode with visual test runner:

```bash
npm run test:ui
```

### Debug Tests

Run tests with debugger attached:

```bash
npm run test:debug
```

### Generate Test Report

```bash
npx playwright test --reporter=html
npx playwright show-report
```

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect } from '@jest/globals'
import { validateTwilioSignature } from '@/lib/security/webhook-validator'

describe('Webhook Validator', () => {
  it('should validate correct signature', () => {
    const result = validateTwilioSignature(
      signature,
      url,
      params,
      authToken
    )
    expect(result).toBe(true)
  })
})
```

### Integration Test Example

```typescript
import { test, expect } from '@playwright/test'

test('should reject invalid webhook signature', async ({ request }) => {
  const response = await request.post('/api/webhook', {
    headers: { 'X-Signature': 'invalid' }
  })
  expect(response.status()).toBe(401)
})
```

## Test Coverage

### Security Tests

- ✅ Webhook signature validation
- ✅ Rate limiting enforcement
- ✅ SQL injection prevention
- ✅ Input validation
- ✅ Multi-tenant isolation
- ✅ Authentication/authorization
- ✅ Timing attack resistance

### Functional Tests

- ✅ SMS send/receive
- ✅ Voice recording webhooks
- ✅ Communications hub UI
- ✅ Search functionality
- ✅ Filter controls

### Performance Tests

- ✅ Rate limit check latency
- ✅ Burst request handling
- ✅ Large payload handling

## Continuous Integration

### GitHub Actions

Tests run automatically on:
- Every push to `main` or `develop`
- Every pull request
- Scheduled nightly runs

### CI Configuration

See `.github/workflows/test.yml` for configuration.

## Debugging Failed Tests

### View Test Traces

Playwright automatically captures traces for failed tests:

```bash
npx playwright show-trace trace.zip
```

### Screenshots

Failed tests generate screenshots in `test-results/`:

```bash
ls test-results/
```

### Logs

Check console logs in test output:

```bash
npm test -- --reporter=line
```

## Common Issues

### Rate Limiting Tests Fail

**Cause:** Redis not configured or connection failed

**Solution:**
```bash
# Check Redis connection
redis-cli ping

# Verify UPSTASH_REDIS_REST_URL is set
echo $UPSTASH_REDIS_REST_URL
```

### Webhook Validation Tests Fail

**Cause:** Missing or incorrect TWILIO_AUTH_TOKEN

**Solution:**
```bash
# Get from Twilio Console
export TWILIO_AUTH_TOKEN=your_token
```

### Integration Tests Time Out

**Cause:** Dev server not running

**Solution:**
```bash
# Start dev server first
npm run dev

# In another terminal
npm test
```

## Test Data Management

### Cleanup Between Tests

Tests should clean up after themselves:

```typescript
test.afterEach(async ({ request }) => {
  // Delete test data
  await request.delete('/api/test-cleanup')
})
```

### Isolated Test Databases

Use separate database for testing:

```bash
# Set in .env.test
DATABASE_URL=postgresql://test:test@localhost:5432/fieldlite_test
```

## Security Testing Best Practices

1. **Never commit real credentials** - Use test credentials only
2. **Test both positive and negative cases** - Valid and invalid inputs
3. **Test edge cases** - Empty strings, null, very long inputs
4. **Test timing attacks** - Ensure constant-time comparisons
5. **Test injection attacks** - SQL, NoSQL, command injection
6. **Test rate limits** - Verify enforcement and bypass attempts

## Performance Benchmarks

### Target Performance

- Unit tests: < 100ms per test
- Integration tests: < 1s per test
- E2E tests: < 10s per test
- Full suite: < 5 minutes

### Measuring Performance

```bash
# Run with timing report
npx playwright test --reporter=list
```

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Test security implications** - Add security tests
3. **Update test documentation** - Document new test cases
4. **Ensure tests pass** - All tests must pass before PR merge

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Jest Documentation](https://jestjs.io)
- [Testing Best Practices](https://testingjavascript.com)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

## Support

For test-related issues:
1. Check this README
2. Review test output and logs
3. Open an issue with test name and error message
4. Tag with `tests` label