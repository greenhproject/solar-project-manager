import crypto from "crypto";

const ENCRYPTION_VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

/**
 * Deriva una clave local estable para el vault de credenciales. Railway debe
 * configurar SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY como un secreto
 * dedicado; no se reutilizan secretos de sesión, JWT o de la integración HMAC.
 */
function getEncryptionKey(): Buffer {
  const material = (process.env.SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY || "").trim();
  if (!material) {
    throw new Error("SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY no está configurada");
  }
  return crypto.createHash("sha256").update(`ghp:support-tickets:vault:${material}`).digest();
}

export function isSupportTicketCredentialsVaultReady(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSupportTicketCredential(plaintext: string): string {
  const value = String(plaintext || "");
  if (!value) throw new Error("No se puede cifrar una credencial vacía");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptSupportTicketCredential(storedValue: string): string {
  const [version, ivEncoded, tagEncoded, ciphertextEncoded, ...extra] = String(storedValue || "").split(":");
  if (
    version !== ENCRYPTION_VERSION ||
    !ivEncoded ||
    !tagEncoded ||
    !ciphertextEncoded ||
    extra.length > 0
  ) {
    throw new Error("Formato de credencial cifrada inválido");
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getEncryptionKey(),
      Buffer.from(ivEncoded, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new Error("No fue posible descifrar la credencial de Soporte");
  }
}

export function isEncryptedSupportTicketCredential(value: string | null | undefined): boolean {
  return String(value || "").startsWith(`${ENCRYPTION_VERSION}:`);
}
