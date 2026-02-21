import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY nao configurada no ambiente');
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hex). Recebido: ${key.length} bytes`,
    );
  }

  return key;
}

/**
 * Criptografa um texto usando AES-256-GCM.
 * Retorna no formato `iv:authTag:ciphertext` (tudo em hex).
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografa um texto no formato `iv:authTag:ciphertext` (hex).
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de ciphertext invalido. Esperado: iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedHex] = parts as [string, string, string];

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Valida que ENCRYPTION_KEY esta configurada e tem 32 bytes.
 * Chamar no startup da aplicacao.
 */
export function validateEncryptionKey(): void {
  getEncryptionKey();
}
