import { getDb } from "./db";
import { passwordResetTokens, users } from "../drizzle/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import crypto from "crypto";

/**
 * Generate a secure random token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a password reset token for a user
 * Returns the token string
 */
export async function createPasswordResetToken(
  userId: number
): Promise<string> {
  const db = await getDb();
  const token = generateResetToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await db!.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
    used: false,
  });

  return token;
}

/**
 * Verify and consume a reset token
 * Returns the user ID if valid, null otherwise
 */
export async function verifyResetToken(token: string): Promise<number | null> {
  const db = await getDb();
  const [resetToken] = await db!
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!resetToken) {
    return null;
  }

  // Mark token as used
  await db!
    .update(passwordResetTokens)
    .set({ used: true })
    .where(eq(passwordResetTokens.id, resetToken.id));

  return resetToken.userId;
}

/**
 * Clean up expired tokens (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = await getDb();
  const now = new Date();
  await db!
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, now));
}
