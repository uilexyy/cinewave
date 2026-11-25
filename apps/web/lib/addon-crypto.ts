import crypto from "crypto";

const SECRET = process.env.ENCRYPTION_SECRET || "default-secret-change-me";
const KEY = Buffer.from(SECRET.padEnd(32, "0").slice(0, 32));

const GCM_PREFIX = "v1:";

/**
 * Encrypts a URL using AES-256-GCM.
 * Format: "v1:" + base64(iv[12] + authTag[16] + ciphertext)
 * IV is randomly generated for each encryption.
 */
export function encryptUrl(url: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([cipher.update(url, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload = Buffer.concat([iv, tag, encrypted]);
  return GCM_PREFIX + payload.toString("base64");
}

/**
 * Decrypts a URL. Supports both new AES-256-GCM format and legacy AES-256-CBC format.
 *
 * New format: "v1:" + base64(iv[12] + authTag[16] + ciphertext)
 * Legacy format: hex string (AES-256-CBC with zero IV)
 */
export function decryptUrl(encrypted: string): string {
  // New AES-256-GCM format
  if (encrypted.startsWith(GCM_PREFIX)) {
    const base64Payload = encrypted.slice(GCM_PREFIX.length);
    const buffer = Buffer.from(base64Payload, "base64");

    if (buffer.length < 12 + 16) {
      throw new Error("Invalid ciphertext: too short");
    }

    const iv = buffer.slice(0, 12);
    const tag = buffer.slice(12, 28);
    const ciphertext = buffer.slice(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  }

  // Legacy AES-256-CBC format (hex string)
  const iv = Buffer.alloc(16, 0);
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, iv);
  const decrypted = decipher.update(encrypted, "hex", "utf8");
  return decrypted + decipher.final("utf8");
}

/**
 * Checks if a ciphertext string uses the new GCM format.
 */
export function isGcmFormat(encrypted: string): boolean {
  return encrypted.startsWith(GCM_PREFIX);
}
