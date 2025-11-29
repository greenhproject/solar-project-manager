import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Create a new user with JWT authentication
 */
export async function createJWTUser(data: {
  email: string;
  password: string;
  name: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Hash the password
  const hashedPassword = await hashPassword(data.password);

  // Generate a unique openId for JWT users (using email as base)
  const openId = `jwt_${data.email}`;

  // Insert user
  const result = await db.insert(users).values({
    openId,
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: "engineer", // Default role
    loginMethod: "jwt",
    lastSignedIn: new Date(),
  });

  return result;
}

/**
 * Get user by email for JWT authentication
 */
export async function getUserByEmailForAuth(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result[0] || null;
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: number, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const hashedPassword = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId));

  return true;
}
