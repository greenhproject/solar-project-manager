import { describe, it, expect } from "vitest";
import { invokeGroq } from "./_core/groqClient";

describe("Groq API Validation", () => {
  it("should validate GROQ_API_KEY by making a simple API call", async () => {
    // Verificar que la API key está configurada
    expect(process.env.GROQ_API_KEY).toBeDefined();
    expect(process.env.GROQ_API_KEY).toMatch(/^gsk_/);

    // Hacer una llamada simple a Groq para validar la key
    const response = await invokeGroq({
      messages: [
        {
          role: "user",
          content: "Di 'OK' si puedes leerme",
        },
      ],
      max_tokens: 10,
    });

    // Verificar que la respuesta es válida
    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);

    console.log("✅ Groq API key válida");
    console.log(`📝 Respuesta de prueba: "${response}"`);
  }, 15000); // 15 segundos timeout
});
