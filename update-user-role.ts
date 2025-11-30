/**
 * Script para actualizar el rol de un usuario a admin
 * 
 * Uso: npx tsx update-user-role.ts <email>
 */

import { getDb } from "./server/db";
import { users } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function updateUserRole(email: string) {
  console.log(`Buscando usuario con email: ${email}`);
  
  const db = await getDb();
  
  if (!db) {
    console.error("❌ No se pudo conectar a la base de datos");
    process.exit(1);
  }
  
  const userList = await db.select().from(users).where(eq(users.email, email));
  const user = userList[0];
  
  if (!user) {
    console.error(`❌ Usuario no encontrado: ${email}`);
    process.exit(1);
  }
  
  console.log(`✅ Usuario encontrado:`, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  
  if (user.role === "admin") {
    console.log(`ℹ️  El usuario ya tiene rol admin`);
    process.exit(0);
  }
  
  console.log(`Actualizando rol de "${user.role}" a "admin"...`);
  
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, user.id));
  
  console.log(`✅ Rol actualizado exitosamente a admin`);
  
  const updatedUserList = await db.select().from(users).where(eq(users.id, user.id));
  const updatedUser = updatedUserList[0];
  
  console.log(`Usuario actualizado:`, {
    id: updatedUser?.id,
    name: updatedUser?.name,
    email: updatedUser?.email,
    role: updatedUser?.role,
  });
}

const email = process.argv[2];

if (!email) {
  console.error("❌ Debes proporcionar un email");
  console.log("Uso: npx tsx update-user-role.ts <email>");
  process.exit(1);
}

updateUserRole(email)
  .then(() => {
    console.log("✅ Script completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
