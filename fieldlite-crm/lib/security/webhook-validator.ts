import crypto from 'crypto'

/**
 * Validates Twilio webhook signatures using HMAC-SHA1
 *
 * @param signature - The X-Twilio-Signature header value
 * @param url - The full webhook URL (including https://)
 * @param params - The POST parameters sent by Twilio
 * @param authToken - Your Twilio Auth Token
 * @returns true if signature is valid, false otherwise
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, any>,
  authToken: string
): boolean {
  try {
    // Twilio concatenates the URL and sorted parameters
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url)

    // Create HMAC-SHA1 hash
    const expectedSignature = crypto
      .createHmac('sha1', authToken)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64')

    // Use timing-safe comparison to prevent timing attacks
    // Ensure buffers are same length for timingSafeEqual
    const signatureBuffer = Buffer.from(signature, 'base64')
    const expectedBuffer = Buffer.from(expectedSignature, 'base64')

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    console.error('Twilio signature validation error:', error)
    return false
  }
}

/**
 * Validates Resend webhook signatures using HMAC-SHA256
 *
 * @param signature - The svix-signature header value
 * @param payload - The raw request body as string
 * @param secret - Your Resend webhook secret
 * @returns true if signature is valid, false otherwise
 */
export function validateResendWebhook(
  signature: string,
  payload: string,
  secret: string
): boolean {
  try {
    // Resend uses Svix for webhooks which includes timestamp in signature
    // Format: v1,timestamp=xxx,signature=yyy
    const sigParts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=')
      acc[key.trim()] = value
      return acc
    }, {} as Record<string, string>)

    const timestamp = sigParts['t']
    const sig = sigParts['v1']

    if (!timestamp || !sig) {
      console.error('Invalid Resend signature format')
      return false
    }

    // Check timestamp is within 5 minutes to prevent replay attacks
    const timestampNum = parseInt(timestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampNum) > 300) {
      console.error('Resend webhook timestamp too old')
      return false
    }

    // Construct signed payload
    const signedPayload = `${timestamp}.${payload}`

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex')

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(sig),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Resend signature validation error:', error)
    return false
  }
}

/**
 * Validates SendGrid inbound parse webhook signatures
 *
 * @param publicKey - Your SendGrid public key
 * @param payload - The raw request body
 * @param signature - The X-Twilio-Email-Event-Webhook-Signature header
 * @param timestamp - The X-Twilio-Email-Event-Webhook-Timestamp header
 * @returns true if signature is valid, false otherwise
 */
export function validateSendGridWebhook(
  publicKey: string,
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    // Verify timestamp is recent (within 10 minutes)
    const timestampNum = parseInt(timestamp, 10)
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - timestampNum) > 600) {
      console.error('SendGrid webhook timestamp too old')
      return false
    }

    // Construct signed payload
    const signedPayload = timestamp + payload

    // Verify signature using public key
    const verify = crypto.createVerify('RSA-SHA256')
    verify.update(signedPayload)

    return verify.verify(publicKey, signature, 'base64')
  } catch (error) {
    console.error('SendGrid signature validation error:', error)
    return false
  }
}

/**
 * Extracts webhook parameters from FormData or URLSearchParams
 * Useful for Twilio webhooks which send form-encoded data
 *
 * @param body - Request body as string or FormData
 * @returns Object with webhook parameters
 */
export function extractWebhookParams(body: string | FormData): Record<string, any> {
  if (typeof body === 'string') {
    const params = new URLSearchParams(body)
    return Object.fromEntries(params.entries())
  }

  if (body instanceof FormData) {
    return Object.fromEntries(body.entries())
  }

  return {}
}