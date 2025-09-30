import { test, expect } from '@playwright/test'
import crypto from 'crypto'

/**
 * Integration tests for API endpoint security
 * Tests webhook validation, rate limiting, and input validation
 */

test.describe('SMS API Security Tests', () => {
  const TWILIO_TEST_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_token'
  const SMS_RECEIVE_ENDPOINT = '/api/twilio/sms/receive'
  const SMS_SEND_ENDPOINT = '/api/twilio/sms/send'

  test('should reject SMS webhook with invalid signature', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${SMS_RECEIVE_ENDPOINT}`

    const params = {
      MessageSid: 'SM_test_12345',
      From: '+12345678900',
      To: '+10987654321',
      Body: 'Test message'
    }

    const body = new URLSearchParams(params).toString()

    const response = await request.post(webhookUrl, {
      data: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'invalid_signature_123'
      }
    })

    expect(response.status()).toBe(401)
  })

  test('should accept SMS webhook with valid signature', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${SMS_RECEIVE_ENDPOINT}`

    const params = {
      MessageSid: 'SM_test_12345',
      From: '+12345678900',
      To: '+10987654321',
      Body: 'Test message'
    }

    // Generate valid Twilio signature
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], webhookUrl)

    const signature = crypto
      .createHmac('sha1', TWILIO_TEST_AUTH_TOKEN)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    const body = new URLSearchParams(params).toString()

    const response = await request.post(webhookUrl, {
      data: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': signature
      }
    })

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/xml')
  })

  test('should rate limit SMS send endpoint', async ({ request }) => {
    const sendUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${SMS_SEND_ENDPOINT}`

    // Make multiple requests quickly
    const requests = Array(15).fill(null).map(() =>
      request.post(sendUrl, {
        data: {
          to: '+12345678900',
          message: 'Test message'
        },
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test_token'}`,
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      })
    )

    const responses = await Promise.all(requests)

    // Should have at least one 429 (rate limited) response
    const rateLimited = responses.filter(r => r.status() === 429)
    expect(rateLimited.length).toBeGreaterThan(0)

    // Check rate limit headers
    const rateLimitedResponse = rateLimited[0]
    expect(rateLimitedResponse.headers()['x-ratelimit-limit']).toBeDefined()
    expect(rateLimitedResponse.headers()['x-ratelimit-remaining']).toBeDefined()
    expect(rateLimitedResponse.headers()['retry-after']).toBeDefined()
  })

  test('should validate phone number format on send', async ({ request }) => {
    const sendUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${SMS_SEND_ENDPOINT}`

    const invalidPhones = [
      '1234567890',      // Missing +
      'invalid',         // Not a number
      '+1',              // Too short
      '+123456789012345' // Too long
    ]

    for (const phone of invalidPhones) {
      const response = await request.post(sendUrl, {
        data: {
          to: phone,
          message: 'Test'
        },
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test_token'}`,
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('phone')
    }
  })

  test('should validate message length on send', async ({ request }) => {
    const sendUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${SMS_SEND_ENDPOINT}`

    const longMessage = 'a'.repeat(1601) // Over 1600 character limit

    const response = await request.post(sendUrl, {
      data: {
        to: '+12345678900',
        message: longMessage
      },
      headers: {
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test_token'}`,
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('too long')
  })

  test('should rate limit SMS receive webhook', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${SMS_RECEIVE_ENDPOINT}`

    const params = {
      MessageSid: 'SM_test_burst',
      From: '+12345678900',
      To: '+10987654321',
      Body: 'Burst test'
    }

    // Generate valid signature
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], webhookUrl)

    const signature = crypto
      .createHmac('sha1', TWILIO_TEST_AUTH_TOKEN)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    const body = new URLSearchParams(params).toString()

    // Send many requests from same phone number
    const requests = Array(70).fill(null).map(() =>
      request.post(webhookUrl, {
        data: body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        failOnStatusCode: false
      })
    )

    const responses = await Promise.all(requests)

    // Should have rate limited responses (limit is 60/min)
    const rateLimited = responses.filter(r => r.status() === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })
})

test.describe('Voice Recording Webhook Security Tests', () => {
  const RECORDING_WEBHOOK_ENDPOINT = '/api/twilio/voice/recording'
  const TWILIO_TEST_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'test_token'

  test('should reject recording webhook with invalid signature', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${RECORDING_WEBHOOK_ENDPOINT}`

    const params = {
      CallSid: 'CA_test_12345',
      RecordingUrl: 'https://api.twilio.com/recording/RE123',
      RecordingSid: 'RE123',
      RecordingDuration: '30',
      RecordingStatus: 'completed'
    }

    const body = new URLSearchParams(params).toString()

    const response = await request.post(webhookUrl, {
      data: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': 'invalid_signature'
      },
      failOnStatusCode: false
    })

    expect(response.status()).toBe(401)
  })

  test('should accept recording webhook with valid signature', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${RECORDING_WEBHOOK_ENDPOINT}`

    const params = {
      CallSid: 'CA_test_12345',
      RecordingUrl: 'https://api.twilio.com/recording/RE123',
      RecordingSid: 'RE123',
      RecordingDuration: '30',
      RecordingStatus: 'completed'
    }

    // Generate valid signature
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], webhookUrl)

    const signature = crypto
      .createHmac('sha1', TWILIO_TEST_AUTH_TOKEN)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    const body = new URLSearchParams(params).toString()

    const response = await request.post(webhookUrl, {
      data: body,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Twilio-Signature': signature
      },
      failOnStatusCode: false
    })

    // May return 404 if call doesn't exist in test DB, but shouldn't be 401
    expect(response.status()).not.toBe(401)
  })

  test('should rate limit recording webhook per call', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${RECORDING_WEBHOOK_ENDPOINT}`

    const callSid = 'CA_rate_limit_test'
    const params = {
      CallSid: callSid,
      RecordingUrl: 'https://api.twilio.com/recording/RE123',
      RecordingSid: 'RE123',
      RecordingDuration: '30',
      RecordingStatus: 'completed'
    }

    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], webhookUrl)

    const signature = crypto
      .createHmac('sha1', TWILIO_TEST_AUTH_TOKEN)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    const body = new URLSearchParams(params).toString()

    // Send multiple requests for same call
    const requests = Array(15).fill(null).map(() =>
      request.post(webhookUrl, {
        data: body,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': signature
        },
        failOnStatusCode: false
      })
    )

    const responses = await Promise.all(requests)

    // Should have rate limited responses (limit is 10/min per call)
    const rateLimited = responses.filter(r => r.status() === 429)
    expect(rateLimited.length).toBeGreaterThan(0)
  })

  test('should require CallSid and RecordingUrl', async ({ request }) => {
    const webhookUrl = `${process.env.BASE_URL || 'http://localhost:3000'}${RECORDING_WEBHOOK_ENDPOINT}`

    // Missing CallSid
    const response1 = await request.post(webhookUrl, {
      data: new URLSearchParams({
        RecordingUrl: 'https://api.twilio.com/recording/RE123'
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      failOnStatusCode: false
    })

    expect(response1.status()).toBe(400)

    // Missing RecordingUrl
    const response2 = await request.post(webhookUrl, {
      data: new URLSearchParams({
        CallSid: 'CA123'
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      failOnStatusCode: false
    })

    expect(response2.status()).toBe(400)
  })
})

test.describe('SQL Injection Prevention Tests', () => {
  test('should prevent SQL injection in search queries', async ({ request }) => {
    const searchEndpoint = '/api/conversations/search'

    const injectionAttempts = [
      "'; DROP TABLE conversations--",
      "' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM profiles--",
      "%'; DELETE FROM messages WHERE '1'='1",
      "\\'; DROP TABLE contacts--"
    ]

    for (const injection of injectionAttempts) {
      const response = await request.get(searchEndpoint, {
        params: { q: injection },
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test_token'}`
        },
        failOnStatusCode: false
      })

      // Should not return 500 (server error from SQL syntax error)
      expect(response.status()).not.toBe(500)

      // Should safely handle the query
      const body = await response.json()
      expect(body).not.toContain('syntax error')
      expect(body).not.toContain('DROP TABLE')
    }
  })

  test('should escape special characters in message body', async ({ request }) => {
    const sendUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/twilio/sms/send`

    const specialMessages = [
      "Test with ' quote",
      'Test with " double quote',
      'Test with \\ backslash',
      'Test with % percent',
      'Test with _ underscore'
    ]

    for (const message of specialMessages) {
      const response = await request.post(sendUrl, {
        data: {
          to: '+12345678900',
          message: message
        },
        headers: {
          'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test_token'}`,
          'Content-Type': 'application/json'
        },
        failOnStatusCode: false
      })

      // Should handle special characters without error
      expect(response.status()).not.toBe(500)
    }
  })
})

test.describe('Multi-tenant Isolation Tests', () => {
  test('should not allow access to other tenant data', async ({ request }) => {
    // This would require setting up test tenants
    // Placeholder test structure
    test.skip('Implement with test tenant setup', () => {})
  })

  test('should filter real-time subscriptions by tenant', async ({ page }) => {
    // This would require setting up real-time monitoring
    // Placeholder test structure
    test.skip('Implement with real-time test setup', () => {})
  })
})

test.describe('Authentication & Authorization Tests', () => {
  test('should reject unauthenticated requests to protected endpoints', async ({ request }) => {
    const protectedEndpoints = [
      '/api/twilio/sms/send',
      '/api/conversations',
      '/api/contacts'
    ]

    for (const endpoint of protectedEndpoints) {
      const response = await request.post(
        `${process.env.BASE_URL || 'http://localhost:3000'}${endpoint}`,
        {
          data: {},
          failOnStatusCode: false
        }
      )

      expect(response.status()).toBe(401)
    }
  })

  test('should reject requests with invalid tokens', async ({ request }) => {
    const sendUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/twilio/sms/send`

    const response = await request.post(sendUrl, {
      data: {
        to: '+12345678900',
        message: 'Test'
      },
      headers: {
        'Authorization': 'Bearer invalid_token_123',
        'Content-Type': 'application/json'
      },
      failOnStatusCode: false
    })

    expect(response.status()).toBe(401)
  })
})

test.describe('Performance & DoS Prevention Tests', () => {
  test('should handle large payloads gracefully', async ({ request }) => {
    const sendUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/twilio/sms/send`

    // Try to send very large payload
    const largePayload = {
      to: '+12345678900',
      message: 'a'.repeat(10000), // 10KB message
      extraData: 'x'.repeat(100000) // 100KB extra data
    }

    const response = await request.post(sendUrl, {
      data: largePayload,
      headers: {
        'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || 'test_token'}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000,
      failOnStatusCode: false
    })

    // Should reject or handle gracefully
    expect([400, 413, 422]).toContain(response.status())
  })

  test('should timeout long-running requests', async ({ request }) => {
    // This would require an endpoint that can simulate slow processing
    test.skip('Implement with slow endpoint simulation', () => {})
  })
})