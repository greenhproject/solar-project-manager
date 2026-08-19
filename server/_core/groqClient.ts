import Groq from "groq-sdk";

// Catálogo validado contra la API de Groq el 19 de agosto de 2026.
// Se usan alternativas para tolerar retiradas o cambios de acceso a modelos.
export const DEFAULT_GROQ_MODELS = [
  "groq/compound-mini",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
] as const;

let groq: Groq | null = null;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY no configurada. Configura la credencial del proveedor de IA.");
  }
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY, timeout: 20_000 });
  }
  return groq;
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqChatOptions {
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Invoca Groq AI para generar respuestas
 * Modelos disponibles:
 * - llama-3.3-70b-versatile (recomendado, más rápido)
 * - llama-3.1-70b-versatile
 * - mixtral-8x7b-32768
 */
export async function invokeGroq(options: GroqChatOptions): Promise<string> {
  const {
    messages,
    temperature = 0.7,
    max_tokens = 1_600,
  } = options;
  const models = options.model
    ? [options.model]
    : [...DEFAULT_GROQ_MODELS];
  let lastError: unknown;

  for (const model of models) {
    try {
      const completion = await getGroqClient().chat.completions.create({
        messages,
        model,
        temperature,
        max_tokens,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (content) return content;
      throw new Error(`El modelo ${model} respondió sin contenido.`);
    } catch (error: any) {
      lastError = error;
      const canFallback =
        error?.status === 404 ||
        error?.status === 429 ||
        error?.error?.error?.code === "model_not_found" ||
        error?.error?.error?.code === "rate_limit_exceeded" ||
        String(error?.message || "").includes("respondió sin contenido");
      if (!canFallback || model === models[models.length - 1]) break;
      console.warn(`[Groq] Modelo no disponible o sin respuesta visible (${model}); probando alternativa.`);
    }
  }

  const detail = lastError instanceof Error ? lastError.message : "Error desconocido";
  console.error("[Groq] Error al invocar Groq AI:", detail);
  throw new Error(`Error al comunicarse con Groq AI: ${detail}`);
}

/**
 * Wrapper compatible con invokeLLM de Manus
 */
export async function invokeLLM(options: {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
}): Promise<{ choices: Array<{ message: { content: string } }> }> {
  const content = await invokeGroq({
    messages: options.messages as GroqMessage[],
    max_tokens: options.max_tokens,
  });

  return {
    choices: [
      {
        message: {
          content,
        },
      },
    ],
  };
}
