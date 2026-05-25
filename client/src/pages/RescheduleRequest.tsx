import { useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle, AlertTriangle } from "lucide-react";

export default function RescheduleRequest() {
  const params = useParams<{ milestoneId: string }>();
  const milestoneId = params.milestoneId;

  const [justification, setJustification] = useState("");
  const [newDate, setNewDate] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">("form");
  const [errorMsg, setErrorMsg] = useState("");

  // Get token from URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token") || "";
  const logId = searchParams.get("logId") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!justification.trim() || !newDate) {
      setErrorMsg("Por favor completa todos los campos.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/scheduled/milestone-reminders/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId,
          justification: justification.trim(),
          newDate,
          token,
        }),
      });

      if (response.ok) {
        setStatus("success");
      } else {
        const data = await response.json();
        setErrorMsg(data.error || "Error al enviar la solicitud");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("Error de conexión. Intenta de nuevo.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Solicitud Enviada
            </h2>
            <p className="text-gray-600 mb-4">
              Tu solicitud de reprogramación ha sido registrada exitosamente.
              El administrador del proyecto revisará tu justificación y te notificará la decisión.
            </p>
            <p className="text-sm text-gray-500">
              Puedes cerrar esta ventana.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
            <Calendar className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl">Solicitud de Reprogramación</CardTitle>
          <CardDescription>
            Hito #{milestoneId} — Completa el formulario para solicitar una nueva fecha
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="newDate">Nueva Fecha Propuesta *</Label>
              <Input
                id="newDate"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification">Justificación *</Label>
              <Textarea
                id="justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explica brevemente por qué necesitas reprogramar este hito y qué acciones tomarás para cumplir la nueva fecha..."
                rows={5}
                required
              />
              <p className="text-xs text-gray-500">
                Mínimo 20 caracteres. Sé claro y específico sobre los motivos.
              </p>
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMsg}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={status === "loading" || justification.length < 20}
            >
              {status === "loading" ? "Enviando..." : "Enviar Solicitud de Reprogramación"}
            </Button>

            <p className="text-xs text-center text-gray-400 mt-4">
              Esta solicitud será revisada por el administrador del proyecto.
              Recibirás una notificación con la decisión.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Green House Project — Solar Project Manager
        </p>
      </div>
    </div>
  );
}
