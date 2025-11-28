import { eq } from "drizzle-orm";
import { users, type InsertUser } from "../drizzle/schema";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./jwtAuth";

/**
 * Obtener usuario por email (para JWT auth)
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Crear usuario con contraseña (para JWT auth)
 */
export async function createUserWithPassword(
  email: string,
  password: string,
  name: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Verificar si el usuario ya existe
  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hashear contraseña
  const hashedPassword = await hashPassword(password);

  // Crear usuario
  const newUser: InsertUser = {
    email,
    password: hashedPassword,
    name,
    loginMethod: "jwt",
    role: "engineer", // Por defecto ingeniero
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  await db.insert(users).values(newUser);

  // Retornar usuario creado
  return await getUserByEmail(email);
}

/**
 * Verificar credenciales de usuario
 */
export async function verifyUserCredentials(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || !user.password) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return null;
  }

  // Actualizar última fecha de inicio de sesión
  const db = await getDb();
  if (db) {
    await db
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.email, email));
  }

  return user;
}

/**
 * Obtener usuario por ID (para JWT auth)
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
