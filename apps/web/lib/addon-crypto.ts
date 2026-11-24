import crypto from "crypto";

const SECRET = process.env.ENCRYPTION_SECRET || "default-secret-change-me";
const KEY = Buffer.from(SECRET.padEnd(32, "0").slice(0, 32));
const IV = Buffer.alloc(16, 0);

export function encryptUrl(url: string): string {
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, IV);
  let encrypted = cipher.update(url, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function decryptUrl(encrypted: string): string {
  const decipher = crypto.createDecipheriv("aes-256-cbc", KEY, IV);
  const decrypted = decipher.update(encrypted, "hex", "utf8");
  return decrypted + decipher.final("utf8");
}
