import { describe, it, expect } from "vitest";

/**
 * Test de validación de RESEND_API_KEY
 * Verifica que la API key esté configurada correctamente
 */
describe("Resend Email Service", () => {
  it("should have RESEND_API_KEY configured", () => {
    expect(process.env.RESEND_API_KEY).toBeDefined();
    expect(process.env.RESEND_API_KEY).toMatch(/^re_/);
    expect(process.env.RESEND_API_KEY!.length).toBeGreaterThan(20);
  });

  it("should be able to import email functions", async () => {
    const emailModule = await import("./_core/email");
    expect(emailModule.sendWelcomeEmail).toBeDefined();
    expect(emailModule.sendPasswordResetEmail).toBeDefined();
    expect(typeof emailModule.sendWelcomeEmail).toBe("function");
    expect(typeof emailModule.sendPasswordResetEmail).toBe("function");
  });
});
