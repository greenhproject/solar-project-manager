/**
 * Herramientas de administración temporal
 * NOTA: Estas rutas deben ser eliminadas en producción
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const adminToolsRouter = router({
  /**
   * Actualizar rol de usuario por email
   * TEMPORAL: Solo para configuración inicial
   */
  updateUserRole: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["admin", "engineer"]),
        secretKey: z.string(), // Clave secreta para proteger la ruta
      })
    )
    .mutation(async ({ input }) => {
      // Validar clave secreta
      if (input.secretKey !== "ghp-admin-2025") {
        throw new Error("Invalid secret key");
      }

      const database = await db.getDb();
      
      if (!database) {
        throw new Error("Database connection failed");
      }

      // Buscar usuario
      const userList = await database
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      const user = userList[0];

      if (!user) {
        throw new Error(`User not found: ${input.email}`);
      }

      // Actualizar rol
      await database
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, user.id));

      console.log(`[AdminTools] Updated user role:`, {
        email: input.email,
        oldRole: user.role,
        newRole: input.role,
      });

      return {
        success: true,
        message: `User role updated from ${user.role} to ${input.role}`,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: input.role,
        },
      };
    }),
});
