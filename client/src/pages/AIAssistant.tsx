import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  Loader2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu asistente de IA para gestión de proyectos solares. Puedo ayudarte a:\n\n- **Analizar el estado** de tus proyectos\n- **Detectar problemas** y cuellos de botella\n- **Sugerir mejoras** en el flujo de trabajo\n- **Predecir retrasos** y riesgos\n- **Optimizar recursos** y tiempos\n\n¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: projects } = trpc.projects.list.useQuery();
  const { data: stats } = trpc.projects.stats.useQuery();
  const analyzeProjects = trpc.ai.analyzeProjects.useQuery(undefined, {
    enabled: false,
  });
  const askQuestion = trpc.ai.askQuestion.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyze = async () => {
    if (!projects || projects.length === 0) {
      toast.error("No hay proyectos para analizar");
      return;
    }

    setIsLoading(true);
    const userMessage: Message = {
      role: "user",
      content: "Analiza todos mis proyectos y dame un reporte completo",
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await analyzeProjects.refetch();
      if (!response.data) {
        throw new Error("No se pudo obtener el análisis");
      }
      const assistantMessage: Message = {
        role: "assistant",
        content:
          typeof response.data.analysis === "string"
            ? response.data.analysis
            : JSON.stringify(response.data.analysis),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Error al analizar proyectos");
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Lo siento, hubo un error al analizar los proyectos. Por favor intenta nuevamente.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askQuestion.mutateAsync({ question: input });
      const assistantMessage: Message = {
        role: "assistant",
        content:
          typeof response.answer === "string"
            ? response.answer
            : JSON.stringify(response.answer),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Error al procesar tu pregunta");
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Lo siento, hubo un error al procesar tu pregunta. Por favor intenta nuevamente.",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-orange-500" />
            Asistente de IA
          </h1>
          <p className="text-gray-600 mt-2">
            Análisis inteligente y sugerencias para optimizar tus proyectos
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !projects || projects.length === 0}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Analizar Todos los Proyectos
        </Button>
      </div>

      {/* Estadísticas Rápidas */}
      {stats && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Proyectos Activos
              </CardDescription>
              <CardTitle className="text-2xl">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Con Retraso
              </CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {stats.overdue}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-500" />
                Completados
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {stats.completed}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Chat Interface */}
      <Card className="flex flex-col h-[calc(100%-16rem)]">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Asistente Inteligente</CardTitle>
              <CardDescription>
                Análisis y recomendaciones en tiempo real
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{message.content}</Streamdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                <span className="text-sm text-gray-600">Pensando...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregunta sobre tus proyectos, pide análisis o sugerencias..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-[60px] w-[60px] bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Presiona Enter para enviar, Shift+Enter para nueva línea
          </p>
        </div>
      </Card>
    </div>
  );
}
