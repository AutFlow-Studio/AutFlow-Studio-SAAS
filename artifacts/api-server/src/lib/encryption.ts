/**
 * AES-256-GCM encryption for sensitive values stored in the database.
 *
 * The encryption key is derived from SESSION_SECRET via SHA-256 so no
 * separate key management is required — the same secret that signs sessions
 * also protects stored API keys.
 *
 * Ciphertext format: `${iv_hex}:${authTag_hex}:${ciphertext_hex}`
 *
 * Security properties:
 *  - Each encrypt() call generates a fresh random 96-bit IV (GCM standard)
 *  - 128-bit auth tag prevents ciphertext tampering
 *  - Plaintext is never logged or returned to the browser
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

function getDerivedKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required for encryption");
  // SHA-256 produces exactly 32 bytes — the correct key size for AES-256
  return createHash("sha256").update(secret).digest();
}

export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 128-bit authentication tag
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(data: string): string {
  const parts = data.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted data format");
  const [ivHex, authTagHex, ciphertextHex] = parts as [
    string,
    string,
    string,
  ];
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
