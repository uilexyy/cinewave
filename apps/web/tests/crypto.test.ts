import assert from "node:assert/strict";
import { encryptUrl, decryptUrl, isGcmFormat } from "../lib/addon-crypto";

async function runTests() {
  console.log("Starting Crypto Tests...");

  const testUrl = "https://example.com/manifest.json";

  // === New GCM format ===
  console.log("\n--- GCM Encryption ---");

  const encrypted = encryptUrl(testUrl);
  assert.ok(encrypted.startsWith("v1:"), "Encrypted URL should start with v1:");
  assert.ok(isGcmFormat(encrypted), "isGcmFormat should return true for new format");
  console.log("PASS: New encryption uses v1: prefix");

  const decrypted = decryptUrl(encrypted);
  assert.equal(decrypted, testUrl, "Decrypted URL should match original");
  console.log("PASS: GCM round-trip successful");

  // Each encryption should produce different ciphertext (random IV)
  const encrypted2 = encryptUrl(testUrl);
  assert.notEqual(encrypted, encrypted2, "Two encryptions of same URL should differ (random IV)");
  console.log("PASS: Random IV produces different ciphertext");

  // === Legacy CBC format ===
  console.log("\n--- Legacy CBC Compatibility ---");

  // Simulate legacy CBC ciphertext (hex format)
  const crypto = await import("node:crypto");
  const SECRET = process.env.ENCRYPTION_SECRET || "default-secret-change-me";
  const KEY = Buffer.from(SECRET.padEnd(32, "0").slice(0, 32));
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv("aes-256-cbc", KEY, iv);
  let legacyEncrypted = cipher.update(testUrl, "utf8", "hex");
  legacyEncrypted += cipher.final("hex");

  const legacyDecrypted = decryptUrl(legacyEncrypted);
  assert.equal(legacyDecrypted, testUrl, "Legacy CBC ciphertext should be readable");
  console.log("PASS: Legacy CBC ciphertext readable");

  // === Tampered ciphertext rejection ===
  console.log("\n--- Tampered Ciphertext ---");

  // Tamper with GCM ciphertext
  const tamperedBuffer = Buffer.from(encrypted.slice(4), "base64");
  tamperedBuffer[tamperedBuffer.length - 1] ^= 0xff; // Flip last byte
  const tamperedEncrypted = "v1:" + tamperedBuffer.toString("base64");

  assert.throws(
    () => decryptUrl(tamperedEncrypted),
    "Tampered GCM ciphertext should throw"
  );
  console.log("PASS: Tampered GCM ciphertext rejected");

  // Tamper with auth tag
  const tagTamperedBuffer = Buffer.from(encrypted.slice(4), "base64");
  // Flip a byte in the auth tag region (bytes 12-27)
  tagTamperedBuffer[15] ^= 0xff;
  const tagTamperedEncrypted = "v1:" + tagTamperedBuffer.toString("base64");

  assert.throws(
    () => decryptUrl(tagTamperedEncrypted),
    "Tampered auth tag should throw"
  );
  console.log("PASS: Tampered auth tag rejected");

  // Wrong IV (modify IV bytes)
  const ivTamperedBuffer = Buffer.from(encrypted.slice(4), "base64");
  ivTamperedBuffer[0] ^= 0xff;
  const ivTamperedEncrypted = "v1:" + ivTamperedBuffer.toString("base64");

  assert.throws(
    () => decryptUrl(ivTamperedEncrypted),
    "Tampered IV should throw"
  );
  console.log("PASS: Tampered IV rejected");

  // === Invalid format rejection ===
  console.log("\n--- Invalid Format ---");

  // Too short GCM payload
  assert.throws(
    () => decryptUrl("v1:AAAA"),
    "Too-short GCM payload should throw"
  );
  console.log("PASS: Too-short GCM payload rejected");

  // Empty string
  assert.throws(
    () => decryptUrl(""),
    "Empty string should throw"
  );
  console.log("PASS: Empty string rejected");

  // === Add-on data compatibility ===
  console.log("\n--- Add-on Data Compatibility ---");

  // Simulate reading an old add-on record (CBC format) and a new one (GCM format)
  const oldRecord = legacyEncrypted;
  const newRecord = encryptUrl(testUrl);

  // Both should decrypt to the same URL
  assert.equal(decryptUrl(oldRecord), testUrl, "Old record should decrypt correctly");
  assert.equal(decryptUrl(newRecord), testUrl, "New record should decrypt correctly");
  console.log("PASS: Old and new add-on records both readable");

  console.log("\nAll Crypto Tests Passed!");
}

runTests().catch((err) => {
  console.error("Crypto test failed:", err);
  process.exit(1);
});
