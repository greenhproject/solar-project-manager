import Groq from "groq-sdk";

// Validar que la API key esté configurada
if (!process.env.GROQ_API_KEY) {
  console.error("[Groq] GROQ_API_KEY no está configurada en las variables de entorno");
  throw new Error("GROQ_API_KEY no configurada. Por favor, agrega la variable de entorno en Railway.");
}

// Inicializar cliente de Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    model = "llama-3.3-70b-versatile",
    temperature = 0.7,
    max_tokens = 4096,
  } = options;

  try {
    const completion = await groq.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens,
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("[Groq] Error al invocar Groq AI:", error);
    throw new Error(`Error al comunicarse con Groq AI: ${error.message}`);
  }
}

/**
 * Wrapper compatible con invokeLLM de Manus
 */
export async function invokeLLM(options: {
  messages: Array<{ role: string; content: string }>;
}): Promise<{ choices: Array<{ message: { content: string } }> }> {
  const content = await invokeGroq({
    messages: options.messages as GroqMessage[],
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
