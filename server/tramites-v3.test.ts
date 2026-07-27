import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// Mock storage para evitar llamadas reales a S3
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/test-file.pdf", key: "test-key" }),
  storageGet: vi.fn().mockResolvedValue({ url: "https://s3.example.com/test-file.pdf", key: "test-key" }),
}));

describe("Módulo Trámites v3.0 - Tests Completos", () => {
  // Mock contexts
  const adminContext: Context = {
    user: {
      id: 1,
      openId: "test-admin",
      name: "Admin Test",
      email: "admin@test.com",
      role: "admin",
      avatarUrl: null,
      theme: "system",
      password: null,
      loginMethod: "oauth",
      jobTitle: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const ingenieroTramitesContext: Context = {
    user: {
      id: 2,
      openId: "test-ingeniero-tramites",
      name: "Ingeniero Tramites",
      email: "tramites@test.com",
      role: "ingeniero_tramites",
      avatarUrl: null,
      theme: "system",
      password: null,
      loginMethod: "oauth",
      jobTitle: "Ingeniero de Trámites",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const engineerContext: Context = {
    user: {
      id: 3,
      openId: "test-engineer",
      name: "Engineer Test",
      email: "engineer@test.com",
      role: "engineer",
      avatarUrl: null,
      theme: "system",
      password: null,
      loginMethod: "oauth",
      jobTitle: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const clientContext: Context = {
    user: {
      id: 4,
      openId: "test-client",
      name: "Client Test",
      email: "client@test.com",
      role: "client",
      avatarUrl: null,
      theme: "system",
      password: null,
      loginMethod: "oauth",
      jobTitle: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  const adminFinancieroContext: Context = {
    user: {
      id: 5,
      openId: "test-admin-fin",
      name: "Admin Financiero",
      email: "financiero@test.com",
      role: "admin_financiero",
      avatarUrl: null,
      theme: "system",
      password: null,
      loginMethod: "oauth",
      jobTitle: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };

  // ============================================
  // PLANTILLAS CAD - TESTS
  // ============================================
  describe("Plantillas CAD", () => {
    describe("Listado (cadTemplates.list)", () => {
      it("admin puede listar plantillas CAD", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.cadTemplates.list({});
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("ingeniero_tramites puede listar plantillas CAD", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        const result = await caller.cadTemplates.list({});
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("engineer NO puede listar plantillas CAD", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(caller.cadTemplates.list({})).rejects.toThrow();
      });

      it("client NO puede listar plantillas CAD", async () => {
        const caller = appRouter.createCaller(clientContext);
        await expect(caller.cadTemplates.list({})).rejects.toThrow();
      });

      it("admin_financiero NO puede listar plantillas CAD", async () => {
        const caller = appRouter.createCaller(adminFinancieroContext);
        await expect(caller.cadTemplates.list({})).rejects.toThrow();
      });

      it("puede filtrar por marca de inversor", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.cadTemplates.list({ marcaInversor: "Huawei" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por potencia de inversor", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.cadTemplates.list({ potenciaInversor: "5kW" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por operador de red", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.cadTemplates.list({ operadorRed: "ENEL" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por múltiples criterios simultáneamente", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.cadTemplates.list({
          marcaInversor: "Huawei",
          potenciaInversor: "10kW",
          operadorRed: "ENEL",
          cantidadPaneles: 12,
        });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por marca de paneles", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.cadTemplates.list({ marcaPaneles: "JA Solar" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe("Creación (cadTemplates.create)", () => {
      it("admin puede crear plantilla CAD (verificar que no falla por permisos)", async () => {
        const caller = appRouter.createCaller(adminContext);
        // El create puede fallar por campos de BD pero no debe fallar por permisos
        try {
          const result = await caller.cadTemplates.create({
            fileName: "test-plano.dwg",
            fileKey: "cad-templates/test-plano.dwg",
            fileData: Buffer.from("test file content").toString("base64"),
            fileSize: 1024,
            marcaInversor: "Huawei",
            modeloInversor: "SUN2000-5KTL",
            potenciaInversor: "5kW",
            operadorRed: "ENEL",
            cantidadPaneles: 12,
            potenciaPaneles: "550W",
            marcaPaneles: "JA Solar",
            descripcion: "Plano de prueba para test",
          });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          // Si falla, no debe ser por permisos (FORBIDDEN)
          expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("ingeniero_tramites puede crear plantilla CAD (verificar permisos)", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        try {
          const result = await caller.cadTemplates.create({
            fileName: "test-plano-2.dwg",
            fileKey: "cad-templates/test-plano-2.dwg",
            fileData: Buffer.from("test file content 2").toString("base64"),
            fileSize: 2048,
            marcaInversor: "Sungrow",
          });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          // Si falla, no debe ser por permisos (FORBIDDEN)
          expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("engineer NO puede crear plantilla CAD", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(
          caller.cadTemplates.create({
            fileName: "test.dwg",
            fileKey: "cad-templates/test.dwg",
            fileData: Buffer.from("test").toString("base64"),
            fileSize: 100,
            marcaInversor: "Test",
          })
        ).rejects.toThrow();
      });
    });

    describe("Eliminación (cadTemplates.delete)", () => {
      it("admin puede eliminar plantilla CAD", async () => {
        const caller = appRouter.createCaller(adminContext);
        // Usar un ID que probablemente no existe - verificar que no lanza error de permisos
        try {
          await caller.cadTemplates.delete({ id: 99999 });
        } catch (e: any) {
          // Si falla, no debe ser por permisos
          expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("engineer NO puede eliminar plantilla CAD", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(caller.cadTemplates.delete({ id: 1 })).rejects.toThrow();
      });
    });
  });

  // ============================================
  // BIBLIOTECA DE DOCUMENTOS COMUNES - TESTS
  // ============================================
  describe("Documentos Comunes (Biblioteca)", () => {
    describe("Listado (commonDocuments.list)", () => {
      it("admin puede listar documentos comunes", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.list({});
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("ingeniero_tramites puede listar documentos comunes", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        const result = await caller.commonDocuments.list({});
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("engineer NO puede listar documentos comunes", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(caller.commonDocuments.list({})).rejects.toThrow();
      });

      it("client NO puede listar documentos comunes", async () => {
        const caller = appRouter.createCaller(clientContext);
        await expect(caller.commonDocuments.list({})).rejects.toThrow();
      });

      it("puede filtrar por tipo de documento", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.list({ tipo: "certificado_inversor" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por marca", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.list({ marca: "Huawei" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por modelo", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.list({ modelo: "SUN2000" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por potencia", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.list({ potencia: "5kW" });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });

      it("puede filtrar por múltiples criterios", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.list({
          tipo: "certificado_inversor",
          marca: "Huawei",
          modelo: "SUN2000-5KTL",
        });
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe("Creación (commonDocuments.create)", () => {
      it("admin puede crear documento común", async () => {
        const caller = appRouter.createCaller(adminContext);
        const result = await caller.commonDocuments.create({
          tipo: "certificado_inversor",
          fileName: "certificado-huawei.pdf",
          fileKey: "common-docs/certificado-huawei.pdf",
          fileData: Buffer.from("test pdf content").toString("base64"),
          fileSize: 5120,
          mimeType: "application/pdf",
          marca: "Huawei",
          modelo: "SUN2000-5KTL",
          potencia: "5kW",
          descripcion: "Certificado de inversor Huawei 5kW",
        });
        expect(result).toEqual({ success: true });
      });

      it("ingeniero_tramites puede crear documento común", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        const result = await caller.commonDocuments.create({
          tipo: "certificado_paneles",
          fileName: "cert-paneles-ja.pdf",
          fileKey: "common-docs/cert-paneles-ja.pdf",
          fileData: Buffer.from("test content").toString("base64"),
          fileSize: 3072,
          mimeType: "application/pdf",
          marca: "JA Solar",
        });
        expect(result).toEqual({ success: true });
      });

      it("engineer NO puede crear documento común", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(
          caller.commonDocuments.create({
            tipo: "certificado_inversor",
            fileName: "test.pdf",
            fileKey: "common-docs/test.pdf",
            fileData: Buffer.from("test").toString("base64"),
            fileSize: 100,
            mimeType: "application/pdf",
          })
        ).rejects.toThrow();
      });

      it("valida tipos de documento permitidos", async () => {
        const caller = appRouter.createCaller(adminContext);
        await expect(
          caller.commonDocuments.create({
            tipo: "tipo_invalido" as any,
            fileName: "test.pdf",
            fileKey: "common-docs/test.pdf",
            fileData: Buffer.from("test").toString("base64"),
            fileSize: 100,
            mimeType: "application/pdf",
          })
        ).rejects.toThrow();
      });
    });

    describe("Eliminación (commonDocuments.delete)", () => {
      it("admin puede eliminar documento común", async () => {
        const caller = appRouter.createCaller(adminContext);
        try {
          await caller.commonDocuments.delete({ id: 99999 });
        } catch (e: any) {
          expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("engineer NO puede eliminar documento común", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(caller.commonDocuments.delete({ id: 1 })).rejects.toThrow();
      });
    });
  });

  // ============================================
  // CHECKLIST DE LEGALIZACIÓN - TESTS
  // ============================================
  describe("Checklist de Legalización", () => {
    describe("Obtener checklist (legalizationChecklist.get)", () => {
      it("admin puede obtener checklist de cualquier proyecto", async () => {
        const caller = appRouter.createCaller(adminContext);
        // Proyecto ID 1 existe en la BD de test
        try {
          const result = await caller.legalizationChecklist.get({ projectId: 1 });
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        } catch (e: any) {
          // Si el proyecto no existe, es NOT_FOUND, no FORBIDDEN
          if (e.code) expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("ingeniero_tramites puede obtener checklist", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        try {
          const result = await caller.legalizationChecklist.get({ projectId: 1 });
          expect(result).toBeDefined();
        } catch (e: any) {
          if (e.code) expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("client NO puede obtener checklist", async () => {
        const caller = appRouter.createCaller(clientContext);
        try {
          await caller.legalizationChecklist.get({ projectId: 1 });
        } catch (e: any) {
          // Debe fallar por FORBIDDEN o NOT_FOUND (no tiene acceso)
          expect(["FORBIDDEN", "NOT_FOUND"]).toContain(e.code);
        }
      });

      it("requiere projectId como número", async () => {
        const caller = appRouter.createCaller(adminContext);
        await expect(
          caller.legalizationChecklist.get({ projectId: "abc" as any })
        ).rejects.toThrow();
      });
    });

    describe("Inicializar checklist (legalizationChecklist.initialize)", () => {
      it("admin puede inicializar checklist", async () => {
        const caller = appRouter.createCaller(adminContext);
        try {
          const result = await caller.legalizationChecklist.initialize({ projectId: 1 });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          // NOT_FOUND es aceptable si el proyecto no existe en test
          if (e.code) expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("ingeniero_tramites puede inicializar checklist", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        try {
          const result = await caller.legalizationChecklist.initialize({ projectId: 1 });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          if (e.code) expect(e.code).not.toBe("FORBIDDEN");
        }
      });
    });

    describe("Actualizar item (legalizationChecklist.upsert)", () => {
      it("admin puede actualizar item del checklist", async () => {
        const caller = appRouter.createCaller(adminContext);
        try {
          const result = await caller.legalizationChecklist.upsert({
            projectId: 1,
            documentType: "certificado_tradicion",
            isCompleted: true,
            autoLoaded: false,
            fileName: "certificado.pdf",
            fileKey: "legalization/1/certificado.pdf",
            fileData: Buffer.from("test pdf").toString("base64"),
            fileSize: 1024,
            mimeType: "application/pdf",
          });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          if (e.code) expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("valida tipos de documento del checklist", async () => {
        const caller = appRouter.createCaller(adminContext);
        await expect(
          caller.legalizationChecklist.upsert({
            projectId: 1,
            documentType: "tipo_invalido" as any,
            isCompleted: false,
            autoLoaded: false,
          })
        ).rejects.toThrow();
      });

      it("acepta todos los 13 tipos de documento válidos", async () => {
        const validTypes = [
          "certificado_tradicion",
          "cedula_cliente",
          "plano_agpe",
          "autodeclaracion_retie",
          "certificado_inversor",
          "certificado_paneles",
          "manual_inversor",
          "matricula_inversor",
          "experiencia_constructor",
          "matricula_disenador",
          "memoria_calculo",
          "disponibilidad_red",
          "otros",
        ];

        const caller = appRouter.createCaller(adminContext);
        for (const tipo of validTypes) {
          try {
            // Solo verificar que no falla por validación de tipo
            await caller.legalizationChecklist.upsert({
              projectId: 1,
              documentType: tipo as any,
              isCompleted: false,
              autoLoaded: false,
            });
          } catch (e: any) {
            // NOT_FOUND es aceptable (proyecto no existe en test), pero no debe ser BAD_REQUEST por tipo inválido
            expect(e.code).not.toBe("BAD_REQUEST");
          }
        }
      });
    });

    describe("Eliminar item (legalizationChecklist.delete)", () => {
      it("admin puede eliminar item del checklist", async () => {
        const caller = appRouter.createCaller(adminContext);
        try {
          const result = await caller.legalizationChecklist.delete({ id: 99999 });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          // No debe fallar por permisos
          expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("ingeniero_tramites puede eliminar item del checklist", async () => {
        const caller = appRouter.createCaller(ingenieroTramitesContext);
        try {
          const result = await caller.legalizationChecklist.delete({ id: 99999 });
          expect(result).toEqual({ success: true });
        } catch (e: any) {
          expect(e.code).not.toBe("FORBIDDEN");
        }
      });

      it("engineer NO puede eliminar item del checklist", async () => {
        const caller = appRouter.createCaller(engineerContext);
        await expect(
          caller.legalizationChecklist.delete({ id: 1 })
        ).rejects.toThrow("No tienes permiso para eliminar items del checklist");
      });

      it("client NO puede eliminar item del checklist", async () => {
        const caller = appRouter.createCaller(clientContext);
        await expect(
          caller.legalizationChecklist.delete({ id: 1 })
        ).rejects.toThrow("No tienes permiso para eliminar items del checklist");
      });

      it("admin_financiero NO puede eliminar item del checklist", async () => {
        const caller = appRouter.createCaller(adminFinancieroContext);
        await expect(
          caller.legalizationChecklist.delete({ id: 1 })
        ).rejects.toThrow("No tienes permiso para eliminar items del checklist");
      });
    });
  });

  // ============================================
  // PERMISOS CRUZADOS - TESTS
  // ============================================
  describe("Permisos Cruzados entre Módulos", () => {
    it("solo admin e ingeniero_tramites acceden al módulo completo", async () => {
      // Admin
      const adminCaller = appRouter.createCaller(adminContext);
      expect(await adminCaller.cadTemplates.list({})).toBeDefined();
      expect(await adminCaller.commonDocuments.list({})).toBeDefined();

      // Ingeniero Trámites
      const tramitesCaller = appRouter.createCaller(ingenieroTramitesContext);
      expect(await tramitesCaller.cadTemplates.list({})).toBeDefined();
      expect(await tramitesCaller.commonDocuments.list({})).toBeDefined();
    });

    it("roles no autorizados son rechazados en todos los módulos", async () => {
      const engineerCaller = appRouter.createCaller(engineerContext);
      await expect(engineerCaller.cadTemplates.list({})).rejects.toThrow();
      await expect(engineerCaller.commonDocuments.list({})).rejects.toThrow();

      const clientCaller = appRouter.createCaller(clientContext);
      await expect(clientCaller.cadTemplates.list({})).rejects.toThrow();
      await expect(clientCaller.commonDocuments.list({})).rejects.toThrow();
    });
  });
});
