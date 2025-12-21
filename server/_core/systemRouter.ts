import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import * as db from "../db";
import { storagePut } from "../storage";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // ============================================
  // CONFIGURACIÓN DE EMPRESA
  // ============================================

  getCompanySettings: publicProcedure.query(async () => {
    return await db.getCompanySettings();
  }),

  updateCompanySettings: adminProcedure
    .input(
      z.object({
        companyName: z.string().min(1, "El nombre de la empresa es requerido"),
        address: z.string().optional(),
        nit: z.string().optional(),
        website: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        logoUrl: z.string().optional(),
        logoKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.upsertCompanySettings({
        ...input,
        updatedBy: ctx.user.id,
      });
    }),

  uploadCompanyLogo: adminProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      
      // Validar tamaño (máximo 2MB)
      if (buffer.length > 2 * 1024 * 1024) {
        throw new Error("El logo no puede superar 2MB");
      }
      
      // Validar tipo de archivo
      if (!["image/png", "image/jpeg", "image/jpg"].includes(input.mimeType)) {
        throw new Error("Solo se permiten archivos PNG o JPG");
      }
      
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const fileKey = `company/logo-${Date.now()}.${ext}`;
      
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      return { logoUrl: url, logoKey: fileKey };
    }),
});
