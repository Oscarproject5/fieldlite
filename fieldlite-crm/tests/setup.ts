/**
 * Jest test setup file
 * Runs before each test file
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

// Mock Upstash Redis for unit tests
jest.mock('@upstash/redis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    pipeline: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([[null, 0], [null, -1]])
  }

  return {
    Redis: jest.fn(() => mockRedis)
  }
})

// Mock Supabase client for unit tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null })
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null })
  }))
}))

// Extend Jest matchers (if needed)
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true
      }
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false
      }
    }
  }
})

// Global test utilities
global.testUtils = {
  // Wait for a condition
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now()
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition')
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  },

  // Generate test data
  generateTestData: {
    phone: () => `+1${Math.floor(Math.random() * 10000000000)}`,
    email: () => `test${Math.random().toString(36).substring(7)}@example.com`,
    uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
}

// Cleanup after all tests
afterAll(() => {
  // Cleanup any open handles
  jest.clearAllTimers()
})

// Export types for TypeScript
declare global {
  var testUtils: {
    waitFor: (condition: () => boolean, timeout?: number) => Promise<void>
    generateTestData: {
      phone: () => string
      email: () => string
      uuid: () => string
    }
  }

  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}