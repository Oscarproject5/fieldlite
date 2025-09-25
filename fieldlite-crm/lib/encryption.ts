import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const DEFAULT_APP_KEY = 'fieldlite-crm-2024-encryption-key';
let missingKeyWarned = false;
let plaintextFormatWarned = false;

const resolveBaseKey = () => {
  const envKey = process.env.ENCRYPTION_KEY?.trim();
  if (envKey) {
    return envKey;
  }

  if (process.env.NODE_ENV === 'production' && !missingKeyWarned) {
    console.warn('ENCRYPTION_KEY env var is not set; falling back to built-in key. Set ENCRYPTION_KEY to secure stored secrets.');
    missingKeyWarned = true;
  }

  return DEFAULT_APP_KEY;
};

// Derive a deterministic 32-byte key optionally namespaced by a salt
const getEncryptionKey = (salt?: string) => {
  const baseKey = resolveBaseKey();
  const keySource = salt ? `${baseKey}-${salt}` : baseKey;

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

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string, salt?: string): string {
  if (!encryptedData) {
    return encryptedData;
  }

  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
      if (!plaintextFormatWarned) {
        console.warn('Encrypted value is not in expected format; treating as plaintext.');
        plaintextFormatWarned = true;
      }
      return encryptedData;
    }

    const key = getEncryptionKey(salt);
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


