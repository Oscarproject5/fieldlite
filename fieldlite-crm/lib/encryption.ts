import crypto from 'crypto';

/**
 * Enhanced encryption service with PBKDF2 key derivation, hierarchical fallback,
 * self-healing capabilities, and comprehensive security features.
 */

// Constants for encryption configuration
const ALGORITHM = 'aes-256-gcm';
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Default key for backwards compatibility (will be phased out)
const DEFAULT_APP_KEY = 'fieldlite-crm-2024-encryption-key';

// Cache for derived keys to improve performance
const keyCache = new Map<string, { key: Buffer; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Metrics tracking for monitoring
const metrics = {
  encryptionAttempts: 0,
  encryptionSuccesses: 0,
  encryptionFailures: 0,
  decryptionAttempts: 0,
  decryptionSuccesses: 0,
  decryptionFailures: 0,
  fallbackDecryptions: 0,
  selfHealingReencryptions: 0,
  cacheHits: 0,
  cacheMisses: 0,
  methodUsage: {
    pbkdf2: 0,
    legacy: 0,
    plaintext: 0,
    envVar: 0
  }
};

// Warning flags to prevent log spam
let missingKeyWarned = false;
let plaintextWarned = false;
let legacyFormatWarned = false;

/**
 * Get the base encryption key from environment or fallback
 */
function resolveBaseKey(): string {
  const envKey = process.env.ENCRYPTION_KEY?.trim();

  if (envKey) {
    metrics.methodUsage.envVar++;
    return envKey;
  }

  if (process.env.NODE_ENV === 'production' && !missingKeyWarned) {
    console.warn(
      '[SECURITY WARNING] ENCRYPTION_KEY environment variable not set in production. ' +
      'Using default key is insecure. Set ENCRYPTION_KEY immediately.'
    );
    missingKeyWarned = true;
  }

  return DEFAULT_APP_KEY;
}

/**
 * Derive a cryptographically secure key using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  const cacheKey = `${password}-${salt.toString('hex')}`;

  // Check cache first
  const cached = keyCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    metrics.cacheHits++;
    return cached.key;
  }

  metrics.cacheMisses++;

  // Derive new key
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');

  // Update cache
  keyCache.set(cacheKey, { key, timestamp: Date.now() });

  // Clean old cache entries
  if (keyCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of keyCache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        keyCache.delete(k);
      }
    }
  }

  return key;
}

/**
 * Get legacy encryption key for backwards compatibility
 */
function getLegacyKey(salt?: string): Buffer {
  const baseKey = resolveBaseKey();
  const keySource = salt ? `${baseKey}-${salt}` : baseKey;
  return crypto.createHash('sha256').update(keySource).digest();
}

/**
 * Encrypt data with enhanced security using PBKDF2
 */
export function encrypt(text: string, salt?: string): string {
  metrics.encryptionAttempts++;

  try {
    // Generate cryptographically secure random salt
    const keySalt = crypto.randomBytes(SALT_LENGTH);

    // Derive key using PBKDF2
    const baseKey = resolveBaseKey();
    const namespaceKey = salt ? `${baseKey}-${salt}` : baseKey;
    const key = deriveKey(namespaceKey, keySalt);

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Format: version:salt:iv:tag:encrypted
    // Version 2 indicates PBKDF2 encryption
    const result = `v2:${keySalt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;

    metrics.encryptionSuccesses++;
    metrics.methodUsage.pbkdf2++;

    return result;
  } catch (error) {
    metrics.encryptionFailures++;
    console.error('[Encryption Error]', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data with hierarchical fallback support
 */
export function decrypt(encryptedData: string, salt?: string): string {
  metrics.decryptionAttempts++;

  if (!encryptedData) {
    return encryptedData;
  }

  // Try multiple decryption strategies in order
  const strategies = [
    () => decryptV2(encryptedData, salt),        // PBKDF2 version
    () => decryptLegacy(encryptedData, salt),    // Legacy version
    () => decryptPlaintext(encryptedData),       // Plaintext fallback
    () => decryptEnvironment(encryptedData)      // Environment variable fallback
  ];

  for (const strategy of strategies) {
    try {
      const result = strategy();
      if (result !== null) {
        metrics.decryptionSuccesses++;
        return result;
      }
    } catch (error) {
      // Continue to next strategy
      continue;
    }
  }

  metrics.decryptionFailures++;
  throw new Error('Failed to decrypt data with any available method');
}

/**
 * Decrypt v2 format (PBKDF2)
 */
function decryptV2(encryptedData: string, salt?: string): string | null {
  if (!encryptedData.startsWith('v2:')) {
    return null;
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 5) {
      throw new Error('Invalid v2 format');
    }

    const [version, keySaltHex, ivHex, tagHex, encrypted] = parts;

    // Parse components
    const keySalt = Buffer.from(keySaltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    // Derive key
    const baseKey = resolveBaseKey();
    const namespaceKey = salt ? `${baseKey}-${salt}` : baseKey;
    const key = deriveKey(namespaceKey, keySalt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    metrics.methodUsage.pbkdf2++;
    return decrypted;
  } catch (error) {
    return null;
  }
}

/**
 * Decrypt legacy format (SHA256 key derivation)
 */
function decryptLegacy(encryptedData: string, salt?: string): string | null {
  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      return null;
    }

    const [ivHex, tagHex, encrypted] = parts;

    // Use legacy key derivation
    const key = getLegacyKey(salt);
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    if (!legacyFormatWarned) {
      console.warn(
        '[Migration Notice] Legacy encrypted data detected. ' +
        'Consider re-encrypting with enhanced security.'
      );
      legacyFormatWarned = true;
    }

    metrics.methodUsage.legacy++;
    metrics.fallbackDecryptions++;

    return decrypted;
  } catch (error) {
    return null;
  }
}

/**
 * Handle plaintext data (with security warning)
 */
function decryptPlaintext(data: string): string | null {
  // Check if it looks like encrypted data
  if (data.includes(':') && data.split(':').length >= 3) {
    return null; // Likely encrypted but failed to decrypt
  }

  // Check if it looks like a Twilio auth token (starts with SK or similar)
  if (data.match(/^(AC|SK|PN|MG|SM|MM|CH|IS|US|PL|TK)[a-f0-9]{30,}$/i)) {
    if (process.env.NODE_ENV === 'production' && !plaintextWarned) {
      console.error(
        '[SECURITY CRITICAL] Plaintext sensitive data detected in production! ' +
        'This is a severe security risk. Encrypt immediately.'
      );
      plaintextWarned = true;
    }

    metrics.methodUsage.plaintext++;
    metrics.fallbackDecryptions++;

    return data;
  }

  return null;
}

/**
 * Try to decrypt using environment variable directly
 */
function decryptEnvironment(encryptedData: string): string | null {
  // Check if the encrypted data matches an environment variable name pattern
  if (encryptedData.startsWith('${') && encryptedData.endsWith('}')) {
    const envVarName = encryptedData.slice(2, -1);
    const value = process.env[envVarName];

    if (value) {
      metrics.methodUsage.envVar++;
      metrics.fallbackDecryptions++;
      return value;
    }
  }

  return null;
}

/**
 * Self-healing function to re-encrypt data with enhanced security
 */
export async function reencryptWithEnhancedSecurity(
  data: string,
  salt?: string
): Promise<{ newEncrypted: string; wasLegacy: boolean }> {
  try {
    // First decrypt with fallback support
    const decrypted = decrypt(data, salt);

    // Check if it was legacy format
    const wasLegacy = !data.startsWith('v2:');

    // Re-encrypt with enhanced security
    const newEncrypted = encrypt(decrypted, salt);

    if (wasLegacy) {
      metrics.selfHealingReencryptions++;
    }

    return { newEncrypted, wasLegacy };
  } catch (error) {
    console.error('[Re-encryption Error]', error);
    throw new Error('Failed to re-encrypt data');
  }
}

/**
 * Validate that a string is properly encrypted
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;

  // Check for v2 format
  if (data.startsWith('v2:')) {
    const parts = data.split(':');
    return parts.length === 5;
  }

  // Check for legacy format
  const parts = data.split(':');
  if (parts.length === 3) {
    // Validate hex format
    return parts.every(part => /^[0-9a-fA-F]+$/.test(part));
  }

  return false;
}

/**
 * Get encryption health metrics
 */
export function getEncryptionMetrics() {
  const total = metrics.encryptionAttempts + metrics.decryptionAttempts;
  const failures = metrics.encryptionFailures + metrics.decryptionFailures;
  const successRate = total > 0 ? ((total - failures) / total) * 100 : 100;

  // Calculate security score
  const totalMethodUsage = Object.values(metrics.methodUsage).reduce((a, b) => a + b, 0);
  const secureMethodUsage = metrics.methodUsage.pbkdf2;
  const securityScore = totalMethodUsage > 0
    ? (secureMethodUsage / totalMethodUsage) * 100
    : 0;

  return {
    ...metrics,
    successRate: successRate.toFixed(2) + '%',
    securityScore: securityScore.toFixed(2) + '%',
    cacheEfficiency: metrics.cacheHits + metrics.cacheMisses > 0
      ? ((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(2) + '%'
      : '0%',
    recommendations: getSecurityRecommendations(metrics, securityScore)
  };
}

/**
 * Get security recommendations based on metrics
 */
function getSecurityRecommendations(metrics: typeof metrics, securityScore: number): string[] {
  const recommendations: string[] = [];

  if (!process.env.ENCRYPTION_KEY) {
    recommendations.push('CRITICAL: Set ENCRYPTION_KEY environment variable immediately');
  }

  if (metrics.methodUsage.plaintext > 0) {
    recommendations.push('CRITICAL: Plaintext sensitive data detected - encrypt immediately');
  }

  if (metrics.methodUsage.legacy > metrics.methodUsage.pbkdf2) {
    recommendations.push('HIGH: Majority of data using legacy encryption - schedule migration');
  }

  if (securityScore < 50) {
    recommendations.push('MEDIUM: Low security score - increase usage of enhanced encryption');
  }

  if (metrics.fallbackDecryptions > metrics.decryptionSuccesses * 0.3) {
    recommendations.push('LOW: High fallback usage - consider data migration');
  }

  if (recommendations.length === 0) {
    recommendations.push('System operating optimally with good security posture');
  }

  return recommendations;
}

/**
 * Clear the key cache (useful for testing or key rotation)
 */
export function clearKeyCache(): void {
  keyCache.clear();
}

/**
 * Export legacy functions for backwards compatibility
 */
export { encrypt as encryptData, decrypt as decryptData };