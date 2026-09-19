import { afterEach, describe, expect, it } from "vitest";
import {
  decryptSupportTicketCredential,
  encryptSupportTicketCredential,
  isEncryptedSupportTicketCredential,
  isSupportTicketCredentialsVaultReady,
} from "./supportTicketsCredentialsVault";

const originalEncryptionKey = process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY;
const originalJwtSecret = process.env.JWT_SECRET;

afterEach(() => {
  if (originalEncryptionKey === undefined) delete process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY;
  else process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY = originalEncryptionKey;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

describe("Support ticket credentials vault", () => {
  it("encrypts values with authenticated encryption and decrypts only with its key", () => {
    process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY = "vault-test-key-with-sufficient-entropy";
    const plaintext = "spm_sensitive_source_key";
    const first = encryptSupportTicketCredential(plaintext);
    const second = encryptSupportTicketCredential(plaintext);

    expect(first).toMatch(/^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(second).not.toBe(first);
    expect(first).not.toContain(plaintext);
    expect(isEncryptedSupportTicketCredential(first)).toBe(true);
    expect(decryptSupportTicketCredential(first)).toBe(plaintext);
  });

  it("rejects tampered ciphertext and does not expose a partial value", () => {
    process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY = "vault-test-key-with-sufficient-entropy";
    const encrypted = encryptSupportTicketCredential("secret-value-that-must-not-leak");
    const [version, iv, tag, ciphertext] = encrypted.split(":");
    // Modifica el primer carácter de un byte significativo del ciphertext,
    // no el último carácter Base64 que puede contener bits de relleno.
    const tamperedCiphertext = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    const tampered = [version, iv, tag, tamperedCiphertext].join(":");

    expect(() => decryptSupportTicketCredential(tampered)).toThrow("No fue posible descifrar");
  });

  it("requires protected key material before persisting credentials", () => {
    delete process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY;
    delete process.env.JWT_SECRET;

    expect(isSupportTicketCredentialsVaultReady()).toBe(false);
    expect(() => encryptSupportTicketCredential("cannot-encrypt-without-key")).toThrow(
      "SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY no está configurada",
    );
  });
});
