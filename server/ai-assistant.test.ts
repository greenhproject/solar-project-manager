import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    name: "Test User",
    email: "test@example.com",
    avatarUrl: null,
    role: "admin",
    createdAt: new Date(),
  };

  return {
    user,
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as any,
  };
}

describe("AI Assistant", () => {
  it(
    "should analyze projects successfully",
    async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Verificar que el procedimiento existe
      expect(caller.ai.analyzeProjects).toBeDefined();

      // Ejecutar análisis
      const result = await caller.ai.analyzeProjects();

      // Verificar respuesta
      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();

      const analysisText =
        typeof result.analysis === "string"
          ? result.analysis
          : Array.isArray(result.analysis)
            ? result.analysis
                .map(item =>
                  typeof item === "string"
                    ? item
                    : "text" in item
                      ? item.text
                      : JSON.stringify(item)
                )
                .join("\n")
            : JSON.stringify(result.analysis);

      expect(analysisText.length).toBeGreaterThan(0);
      console.log("✅ Análisis de proyectos completado");
      console.log(`📊 Longitud del análisis: ${analysisText.length} caracteres`);
    },
    30000
  ); // 30 segundos timeout

  it("should answer questions about projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Verificar que el procedimiento existe
    expect(caller.ai.askQuestion).toBeDefined();

    // Hacer una pregunta
    const result = await caller.ai.askQuestion({
      question: "¿Cuántos proyectos hay en total?",
    });

    // Verificar respuesta
    expect(result).toBeDefined();
    expect(result.answer).toBeDefined();

    const answerText =
      typeof result.answer === "string"
        ? result.answer
        : Array.isArray(result.answer)
          ? result.answer
              .map(item =>
                typeof item === "string"
                  ? item
                  : "text" in item
                    ? item.text
                    : JSON.stringify(item)
              )
              .join("\n")
          : JSON.stringify(result.answer);

    expect(answerText.length).toBeGreaterThan(0);
    console.log("✅ Pregunta respondida correctamente");
    console.log(`💬 Respuesta: ${answerText.substring(0, 100)}...`);
  }, 30_000);

  it(
    "should generate report successfully",
    async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Verificar que el procedimiento existe
      expect(caller.ai.generateReport).toBeDefined();

      // Generar informe
      const result = await caller.ai.generateReport();

      // Verificar respuesta
      expect(result).toBeDefined();
      expect(result.reportContent).toBeDefined();
      expect(result.timestamp).toBeDefined();

      const reportText =
        typeof result.reportContent === "string"
          ? result.reportContent
          : Array.isArray(result.reportContent)
            ? result.reportContent
                .map(item =>
                  typeof item === "string"
                    ? item
                    : "text" in item
                      ? item.text
                      : JSON.stringify(item)
                )
                .join("\n")
            : JSON.stringify(result.reportContent);

      expect(reportText.length).toBeGreaterThan(0);
      console.log("✅ Informe generado correctamente");
      console.log(`📄 Timestamp: ${result.timestamp}`);
      console.log(`📋 Longitud del informe: ${reportText.length} caracteres`);
    },
    30000
  ); // 30 segundos timeout

  it("should reject an empty question before invoking the model", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ai.askQuestion({ question: "" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });
});
