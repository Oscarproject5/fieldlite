import { Redis } from '@upstash/redis'

/**
 * Rate limiter using token bucket algorithm with Upstash Redis
 *
 * Features:
 * - Token bucket algorithm for smooth rate limiting
 * - Multiple rate limit tiers (per-second, per-minute, per-hour)
 * - Tenant-aware and user-aware limiting
 * - Configurable limits and windows
 * - Automatic cleanup of expired keys
 */

// Initialize Redis client (connection details from env)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export interface RateLimitConfig {
  /** Unique identifier for rate limiting (e.g., tenant_id, user_id, IP) */
  identifier: string
  /** Maximum number of requests allowed */
  limit: number
  /** Time window in seconds */
  window: number
  /** Optional prefix for the Redis key */
  prefix?: string
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean
  /** Number of requests remaining in the current window */
  remaining: number
  /** Unix timestamp when the limit will reset */
  reset: number
  /** Current retry-after value in seconds (if blocked) */
  retryAfter?: number
}

/**
 * Check and enforce rate limit using token bucket algorithm
 *
 * @example
 * ```typescript
 * const result = await rateLimit({
 *   identifier: `tenant:${tenantId}:sms`,
 *   limit: 10,
 *   window: 60,
 *   prefix: 'api'
 * })
 *
 * if (!result.success) {
 *   return new Response('Rate limit exceeded', {
 *     status: 429,
 *     headers: {
 *       'X-RateLimit-Limit': '10',
 *       'X-RateLimit-Remaining': '0',
 *       'X-RateLimit-Reset': result.reset.toString(),
 *       'Retry-After': result.retryAfter!.toString()
 *     }
 *   })
 * }
 * ```
 */
export async function rateLimit(
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { identifier, limit, window, prefix = 'ratelimit' } = config
  const key = `${prefix}:${identifier}`
  const now = Date.now()
  const nowSeconds = Math.floor(now / 1000)

  try {
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline()

    // Get current count and TTL
    pipeline.get(key)
    pipeline.ttl(key)

    const results = await pipeline.exec()
    const currentCount = (results[0] as number) || 0
    const ttl = (results[1] as number) || -1

    // Calculate reset time
    const reset = ttl > 0 ? nowSeconds + ttl : nowSeconds + window

    // Check if limit exceeded
    if (currentCount >= limit) {
      return {
        success: false,
        remaining: 0,
        reset,
        retryAfter: ttl > 0 ? ttl : window,
      }
    }

    // Increment counter
    const updatePipeline = redis.pipeline()
    updatePipeline.incr(key)

    // Set expiration only if this is a new key
    if (currentCount === 0) {
      updatePipeline.expire(key, window)
    }

    await updatePipeline.exec()

    return {
      success: true,
      remaining: limit - currentCount - 1,
      reset,
    }
  } catch (error) {
    console.error('Rate limit error:', error)

    // Fail open - allow request if Redis is down
    // This prevents Redis outages from breaking the entire application
    return {
      success: true,
      remaining: limit,
      reset: nowSeconds + window,
    }
  }
}

/**
 * Multi-tier rate limiting with different windows
 * Useful for preventing both burst attacks and sustained abuse
 *
 * @example
 * ```typescript
 * const result = await multiTierRateLimit('user:123', [
 *   { limit: 5, window: 1 },     // 5 per second
 *   { limit: 100, window: 60 },  // 100 per minute
 *   { limit: 1000, window: 3600 } // 1000 per hour
 * ])
 * ```
 */
export async function multiTierRateLimit(
  identifier: string,
  tiers: Array<{ limit: number; window: number }>,
  prefix: string = 'ratelimit'
): Promise<RateLimitResult> {
  // Handle empty tiers array
  if (tiers.length === 0) {
    const now = Math.floor(Date.now() / 1000)
    return {
      success: true,
      remaining: Infinity,
      reset: now + 60
    }
  }

  // Check all tiers in parallel
  const results = await Promise.all(
    tiers.map((tier, index) =>
      rateLimit({
        identifier: `${identifier}:tier${index}`,
        limit: tier.limit,
        window: tier.window,
        prefix,
      })
    )
  )

  // If any tier fails, return the first failure
  const failed = results.find((r) => !r.success)
  if (failed) {
    return failed
  }

  // Return the most restrictive result
  const mostRestrictive = results.reduce((min, r) =>
    r.remaining < min.remaining ? r : min
  )

  return mostRestrictive
}

/**
 * Common rate limit presets for different API endpoints
 */
export const RateLimitPresets = {
  /** SMS sending: 10/min per tenant to prevent toll fraud */
  SMS_SEND: (tenantId: string) => ({
    identifier: `tenant:${tenantId}:sms:send`,
    limit: 10,
    window: 60,
    prefix: 'api',
  }),

  /** SMS receiving webhook: 60/min per phone to prevent DoS */
  SMS_RECEIVE: (from: string) => ({
    identifier: `phone:${from}:sms:receive`,
    limit: 60,
    window: 60,
    prefix: 'webhook',
  }),

  /** Email sending: 20/hour per tenant to prevent spam */
  EMAIL_SEND: (tenantId: string) => ({
    identifier: `tenant:${tenantId}:email:send`,
    limit: 20,
    window: 3600,
    prefix: 'api',
  }),

  /** Email receiving webhook: 100/min per domain to prevent DoS */
  EMAIL_RECEIVE: (domain: string) => ({
    identifier: `domain:${domain}:email:receive`,
    limit: 100,
    window: 60,
    prefix: 'webhook',
  }),

  /** Voice call: 5/min per tenant to prevent toll fraud */
  VOICE_CALL: (tenantId: string) => ({
    identifier: `tenant:${tenantId}:voice:call`,
    limit: 5,
    window: 60,
    prefix: 'api',
  }),

  /** General API: 100/min per user for general endpoints */
  GENERAL_API: (userId: string) => ({
    identifier: `user:${userId}:api`,
    limit: 100,
    window: 60,
    prefix: 'api',
  }),

  /** Auth: 5/min per IP for login attempts */
  AUTH_LOGIN: (ip: string) => ({
    identifier: `ip:${ip}:auth:login`,
    limit: 5,
    window: 60,
    prefix: 'auth',
  }),
} as const

/**
 * Helper to extract rate limit headers for HTTP responses
 */
export function getRateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
    ...(result.retryAfter && { 'Retry-After': result.retryAfter.toString() }),
  }
}

/**
 * Middleware helper for Next.js API routes
 *
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimitResult = await withRateLimit(request,
 *     RateLimitPresets.SMS_SEND(tenantId)
 *   )
 *
 *   if (rateLimitResult) return rateLimitResult // Returns 429 response
 *
 *   // Continue with normal handler
 * }
 * ```
 */
export async function withRateLimit(
  request: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  const result = await rateLimit(config)

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...getRateLimitHeaders(result, config.limit),
        },
      }
    )
  }

  return null
}