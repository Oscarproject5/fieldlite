import crypto from 'crypto';

const algorithm = 'aes-256-gcm';

// Get encryption key - use a deterministic key based on the account SID
// This way each tenant has their own encryption key without needing env vars
const getEncryptionKey = (salt?: string) => {
  // Use a combination of a fixed app secret and a unique salt (like account SID)
  // This provides encryption without requiring environment variable setup
  const baseKey = 'fieldlite-crm-2024-encryption-key';
  const keySource = salt ? `${baseKey}-${salt}` : baseKey;

  // Create a 32-byte key for AES-256
  return crypto.createHash('sha256').update(keySource).digest();
};

export function encrypt(text: string, salt?: string): string {
  try {
    const key = getEncryptionKey(salt);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string, salt?: string): string {
  try {
    const key = getEncryptionKey(salt);
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}