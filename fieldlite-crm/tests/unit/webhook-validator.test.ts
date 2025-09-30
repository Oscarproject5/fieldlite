import { describe, it, expect } from '@jest/globals'
import crypto from 'crypto'
import {
  validateTwilioSignature,
  validateResendWebhook,
  extractWebhookParams
} from '@/lib/security/webhook-validator'

describe('Webhook Validator', () => {
  describe('validateTwilioSignature', () => {
    it('should validate correct Twilio signature', () => {
      const authToken = 'test_auth_token_12345'
      const url = 'https://example.com/api/twilio/sms/receive'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        From: '+12345678900',
        To: '+10987654321',
        Body: 'Hello World'
      }

      // Generate valid signature
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url)

      const expectedSignature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      const isValid = validateTwilioSignature(
        expectedSignature,
        url,
        params,
        authToken
      )

      expect(isValid).toBe(true)
    })

    it('should reject invalid Twilio signature', () => {
      const authToken = 'test_auth_token_12345'
      const url = 'https://example.com/api/twilio/sms/receive'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        From: '+12345678900',
        To: '+10987654321',
        Body: 'Hello World'
      }

      const invalidSignature = 'invalid_signature_abc123'

      const isValid = validateTwilioSignature(
        invalidSignature,
        url,
        params,
        authToken
      )

      expect(isValid).toBe(false)
    })

    it('should reject signature with tampered params', () => {
      const authToken = 'test_auth_token_12345'
      const url = 'https://example.com/api/twilio/sms/receive'
      const params = {
        MessageSid: 'SM1234567890abcdef',
        From: '+12345678900',
        To: '+10987654321',
        Body: 'Hello World'
      }

      // Generate signature with original params
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url)

      const signature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      // Tamper with params after signature generation
      params.Body = 'Tampered message'

      const isValid = validateTwilioSignature(
        signature,
        url,
        params,
        authToken
      )

      expect(isValid).toBe(false)
    })

    it('should handle empty params', () => {
      const authToken = 'test_auth_token_12345'
      const url = 'https://example.com/api/twilio/sms/receive'
      const params = {}

      const data = url
      const signature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      const isValid = validateTwilioSignature(
        signature,
        url,
        params,
        authToken
      )

      expect(isValid).toBe(true)
    })

    it('should be case-sensitive for parameter values', () => {
      const authToken = 'test_auth_token_12345'
      const url = 'https://example.com/api/twilio/sms/receive'
      const params = {
        Body: 'Hello World'
      }

      const data = 'Body' + 'Hello World' + url
      const signature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      // Change case
      params.Body = 'hello world'

      const isValid = validateTwilioSignature(
        signature,
        url,
        params,
        authToken
      )

      expect(isValid).toBe(false)
    })
  })

  describe('validateResendWebhook', () => {
    it('should validate correct Resend webhook signature', () => {
      const secret = 'whsec_test_secret_key'
      const timestamp = Math.floor(Date.now() / 1000)
      const payload = JSON.stringify({
        type: 'email.delivered',
        data: {
          email_id: 'abc123',
          to: 'user@example.com'
        }
      })

      // Generate valid signature
      const signedPayload = `${timestamp}.${payload}`
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')

      const signature = `t=${timestamp},v1=${expectedSignature}`

      const isValid = validateResendWebhook(signature, payload, secret)

      expect(isValid).toBe(true)
    })

    it('should reject invalid Resend signature', () => {
      const secret = 'whsec_test_secret_key'
      const payload = JSON.stringify({
        type: 'email.delivered'
      })

      const invalidSignature = 't=1234567890,v1=invalid_signature'

      const isValid = validateResendWebhook(invalidSignature, payload, secret)

      expect(isValid).toBe(false)
    })

    it('should reject expired timestamp (replay attack)', () => {
      const secret = 'whsec_test_secret_key'
      // Timestamp from 20 minutes ago
      const timestamp = Math.floor(Date.now() / 1000) - (20 * 60)
      const payload = JSON.stringify({
        type: 'email.delivered'
      })

      const signedPayload = `${timestamp}.${payload}`
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')

      const webhookSignature = `t=${timestamp},v1=${signature}`

      const isValid = validateResendWebhook(webhookSignature, payload, secret)

      expect(isValid).toBe(false)
    })

    it('should accept recent timestamp within tolerance', () => {
      const secret = 'whsec_test_secret_key'
      // Timestamp from 2 minutes ago (within 5 minute tolerance)
      const timestamp = Math.floor(Date.now() / 1000) - (2 * 60)
      const payload = JSON.stringify({
        type: 'email.delivered'
      })

      const signedPayload = `${timestamp}.${payload}`
      const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex')

      const webhookSignature = `t=${timestamp},v1=${signature}`

      const isValid = validateResendWebhook(webhookSignature, payload, secret)

      expect(isValid).toBe(true)
    })

    it('should reject malformed signature format', () => {
      const secret = 'whsec_test_secret_key'
      const payload = JSON.stringify({ type: 'email.delivered' })

      // Missing timestamp
      const malformedSignature = 'v1=abc123'

      const isValid = validateResendWebhook(malformedSignature, payload, secret)

      expect(isValid).toBe(false)
    })
  })

  describe('extractWebhookParams', () => {
    it('should extract params from URL-encoded string', () => {
      const body = 'MessageSid=SM123&From=%2B12345678900&To=%2B10987654321&Body=Hello+World'

      const params = extractWebhookParams(body)

      expect(params).toEqual({
        MessageSid: 'SM123',
        From: '+12345678900',
        To: '+10987654321',
        Body: 'Hello World'
      })
    })

    it('should handle empty string', () => {
      const body = ''

      const params = extractWebhookParams(body)

      expect(params).toEqual({})
    })

    it('should handle special characters in values', () => {
      const body = 'Body=Hello%20%26%20goodbye%21&Name=Test%2BUser'

      const params = extractWebhookParams(body)

      expect(params).toEqual({
        Body: 'Hello & goodbye!',
        Name: 'Test+User'
      })
    })

    it('should handle duplicate keys (takes last value)', () => {
      const body = 'key=value1&key=value2&key=value3'

      const params = extractWebhookParams(body)

      // URLSearchParams takes the last value for duplicate keys
      expect(params.key).toBe('value3')
    })

    it('should handle params without values', () => {
      const body = 'flag1&flag2=value&flag3'

      const params = extractWebhookParams(body)

      expect(params.flag1).toBe('')
      expect(params.flag2).toBe('value')
      expect(params.flag3).toBe('')
    })
  })

  describe('Timing attack resistance', () => {
    it('should use constant-time comparison', () => {
      const authToken = 'test_auth_token_12345'
      const url = 'https://example.com/webhook'
      const params = { test: 'value' }

      const data = 'test' + 'value' + url
      const validSignature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      // Measure time for correct signature
      const startValid = process.hrtime.bigint()
      validateTwilioSignature(validSignature, url, params, authToken)
      const endValid = process.hrtime.bigint()
      const validTime = endValid - startValid

      // Measure time for incorrect signature
      const startInvalid = process.hrtime.bigint()
      validateTwilioSignature('invalid_signature', url, params, authToken)
      const endInvalid = process.hrtime.bigint()
      const invalidTime = endInvalid - startInvalid

      // Times should be similar (within reasonable margin)
      // Note: This is a rough check, not a rigorous timing attack test
      const timeDiff = Number(validTime - invalidTime) / 1000000 // Convert to ms
      expect(Math.abs(timeDiff)).toBeLessThan(10) // Within 10ms
    })
  })

  describe('Security edge cases', () => {
    it('should handle very long signatures without crashing', () => {
      const authToken = 'test_auth_token'
      const url = 'https://example.com/webhook'
      const params = {}

      const longSignature = 'a'.repeat(10000)

      expect(() => {
        validateTwilioSignature(longSignature, url, params, authToken)
      }).not.toThrow()
    })

    it('should handle special characters in URL', () => {
      const authToken = 'test_auth_token'
      const url = 'https://example.com/webhook?param=value&foo=bar'
      const params = { test: 'value' }

      // Twilio signature: URL + sorted params
      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url)

      const signature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      const isValid = validateTwilioSignature(signature, url, params, authToken)
      expect(isValid).toBe(true)
    })

    it('should handle Unicode in webhook params', () => {
      const authToken = 'test_auth_token'
      const url = 'https://example.com/webhook'
      const params = {
        Body: '你好世界 🌍',
        From: '+12345678900'
      }

      const data = Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + params[key], url)

      const signature = crypto
        .createHmac('sha1', authToken)
        .update(Buffer.from(data, 'utf-8'))
        .digest('base64')

      const isValid = validateTwilioSignature(signature, url, params, authToken)
      expect(isValid).toBe(true)
    })
  })
})