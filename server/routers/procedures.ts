/**
 * Procedimientos compartidos para routers tRPC
 * Define procedimientos reutilizables con diferentes niveles de autorización
 */

import { protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/**
 * Procedimiento que requiere rol de administrador
 * Lanza error FORBIDDEN si el usuario no es admin
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo los administradores pueden realizar esta acción",
    });
  }
  return next({ ctx });
});

/**
 * Procedimiento que requiere autenticación (cualquier rol)
 * Ya está definido en _core/trpc.ts como protectedProcedure
 */
export { protectedProcedure } from "../_core/trpc";

/**
 * Procedimiento público (no requiere autenticación)
 * Ya está definido en _core/trpc.ts como publicProcedure
 */
export { publicProcedure } from "../_core/trpc";
