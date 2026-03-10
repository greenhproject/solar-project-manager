import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Webhook OpenSolar - Funciones de base de datos", () => {
  // Test de funciones disponibles
  it("debe tener la función createWebhookLog disponible", () => {
    expect(typeof db.createWebhookLog).toBe("function");
  });

  it("debe tener la función getWebhookLogs disponible", () => {
    expect(typeof db.getWebhookLogs).toBe("function");
  });

  it("debe tener la función getProjectByOpenSolarId disponible", () => {
    expect(typeof db.getProjectByOpenSolarId).toBe("function");
  });

  it("debe tener la función updateProjectFromOpenSolar disponible", () => {
    expect(typeof db.updateProjectFromOpenSolar).toBe("function");
  });

  // Test de getProjectByOpenSolarId con ID inexistente
  it("debe retornar null para un openSolarId inexistente", async () => {
    const result = await db.getProjectByOpenSolarId("999999999");
    expect(result).toBeNull();
  });

  // Test de getWebhookLogs
  it("debe retornar un array al consultar webhook logs", async () => {
    const logs = await db.getWebhookLogs(5);
    expect(Array.isArray(logs)).toBe(true);
  });

  // Test de createWebhookLog
  it("debe poder crear un registro de webhook log", async () => {
    await expect(
      db.createWebhookLog({
        source: "opensolar",
        event: "UPDATE",
        model: "Project",
        modelId: 999999,
        eventId: 1,
        action: "test_action",
        status: "ignored",
        message: "Test webhook log from vitest",
        payload: '{"test": true}',
      })
    ).resolves.not.toThrow();
  });
});

describe("Webhook Handler - Lógica de detección de venta", () => {
  // Importar el módulo del webhook handler para testear la lógica
  it("debe existir el archivo webhookHandler.ts", async () => {
    const handler = await import("./webhookHandler");
    expect(handler).toBeDefined();
    expect(typeof handler.registerWebhookRoutes).toBe("function");
  });
});
