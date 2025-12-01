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
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  const [analysisData, setAnalysisData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: projects } = trpc.projects.list.useQuery();
  const { data: stats } = trpc.projects.stats.useQuery();
  const analyzeProjects = trpc.ai.analyzeProjects.useQuery(undefined, {
    enabled: false,
  });
  const askQuestion = trpc.ai.askQuestion.useMutation();
  const generateReport = trpc.ai.generateReport.useMutation();

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

      // Guardar datos del análisis para el reporte
      setAnalysisData({
        analysis: response.data.analysis,
        stats,
        projects,
        timestamp: new Date().toISOString(),
      });

      // Convertir analysis a string si es necesario
      const analysisText =
        typeof response.data.analysis === "string"
          ? response.data.analysis
          : Array.isArray(response.data.analysis)
            ? response.data.analysis
                .map((item: any) =>
                  typeof item === "string"
                    ? item
                    : "text" in item
                      ? item.text
                      : JSON.stringify(item)
                )
                .join("\n")
            : JSON.stringify(response.data.analysis);

      const assistantMessage: Message = {
        role: "assistant",
        content: analysisText,
      };
      setMessages(prev => [...prev, assistantMessage]);
      toast.success("Análisis completado");
    } catch (error: any) {
      console.error("Error al analizar proyectos:", error);
      toast.error("Error al analizar proyectos: " + (error.message || "Error desconocido"));
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Lo siento, hubo un error al analizar los proyectos. Por favor intenta nuevamente. Error: " +
          (error.message || "Error desconocido"),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!analysisData) {
      toast.error("Primero debes analizar los proyectos");
      return;
    }

    try {
      toast.info("Generando informe...");
      const response = await generateReport.mutateAsync();

      if (response.reportContent) {
        // Convertir reportContent a string
        const reportText =
          typeof response.reportContent === "string"
            ? response.reportContent
            : Array.isArray(response.reportContent)
              ? response.reportContent
                  .map((item: any) =>
                    typeof item === "string"
                      ? item
                      : "text" in item
                        ? item.text
                        : JSON.stringify(item)
                  )
                  .join("\n")
              : JSON.stringify(response.reportContent);

        // Crear blob con el contenido Markdown
        const blob = new Blob([reportText], {
          type: "text/markdown",
        });
        const url = URL.createObjectURL(blob);

        // Descargar el archivo
        const link = document.createElement("a");
        link.href = url;
        link.download = `informe-proyectos-${new Date().toISOString().split("T")[0]}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Informe generado y descargado en formato Markdown");

        // Mostrar el informe en el chat
        const reportMessage: Message = {
          role: "assistant",
          content: reportText,
        };
        setMessages(prev => [...prev, reportMessage]);
      } else {
        toast.error("No se pudo generar el informe");
      }
    } catch (error: any) {
      console.error("Error al generar informe:", error);
      toast.error(
        "Error al generar informe: " + (error.message || "Error desconocido")
      );
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
      
      // Convertir answer a string si es necesario
      const answerText =
        typeof response.answer === "string"
          ? response.answer
          : Array.isArray(response.answer)
            ? response.answer
                .map((item: any) =>
                  typeof item === "string"
                    ? item
                    : "text" in item
                      ? item.text
                      : JSON.stringify(item)
                )
                .join("\n")
            : JSON.stringify(response.answer);
      
      const assistantMessage: Message = {
        role: "assistant",
        content: answerText,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error al enviar mensaje:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-orange-500" />
              Asistente de IA
            </h1>
            <p className="text-gray-600 mt-1">
              Análisis inteligente y sugerencias para optimizar tus proyectos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !projects || projects.length === 0}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analizar Todos los Proyectos
                </>
              )}
            </Button>
            {analysisData && (
              <Button
                onClick={handleGenerateReport}
                disabled={generateReport.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar Informe PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Proyectos Activos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.active || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Con Retraso</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.overdue || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.completed || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-apple border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.total || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-orange-500" />
              Asistente Inteligente
            </CardTitle>
            <CardDescription>
              Análisis y recomendaciones en tiempo real
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Messages */}
              <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                          : "bg-white shadow-sm border border-gray-200"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
                      <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Pregunta sobre tus proyectos, pide análisis o sugerencias..."
                  className="min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Presiona Enter para enviar, Shift+Enter para nueva línea
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-orange-500" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Preguntas frecuentes y análisis comunes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start text-left"
                onClick={() => {
                  setInput("¿Qué proyectos están retrasados y por qué?");
                  setTimeout(handleSendMessage, 100);
                }}
                disabled={isLoading}
              >
                <AlertCircle className="h-5 w-5 text-red-500 mb-2" />
                <p className="font-semibold">Proyectos Retrasados</p>
                <p className="text-xs text-gray-500">
                  Identifica proyectos con retraso
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start text-left"
                onClick={() => {
                  setInput("¿Cuáles son los hitos críticos de esta semana?");
                  setTimeout(handleSendMessage, 100);
                }}
                disabled={isLoading}
              >
                <Clock className="h-5 w-5 text-orange-500 mb-2" />
                <p className="font-semibold">Hitos Críticos</p>
                <p className="text-xs text-gray-500">
                  Revisa hitos próximos a vencer
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex-col items-start text-left"
                onClick={() => {
                  setInput(
                    "Dame sugerencias para optimizar el flujo de trabajo"
                  );
                  setTimeout(handleSendMessage, 100);
                }}
                disabled={isLoading}
              >
                <Lightbulb className="h-5 w-5 text-yellow-500 mb-2" />
                <p className="font-semibold">Optimización</p>
                <p className="text-xs text-gray-500">
                  Sugerencias de mejora
                </p>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
