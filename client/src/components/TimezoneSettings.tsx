import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Globe, Clock, Check, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function TimezoneSettings() {
  const { data, isLoading, refetch } = trpc.appSettings.getTimezone.useQuery();
  const setTimezoneMutation = trpc.appSettings.setTimezone.useMutation({
    onSuccess: (result) => {
      toast.success("Zona horaria actualizada", {
        description: `La zona horaria se cambió a ${result.timezone}`,
      });
      refetch();
    },
    onError: (error) => {
      toast.error("Error al actualizar zona horaria", {
        description: error.message,
      });
    },
  });

  const [selectedTimezone, setSelectedTimezone] = useState<string>("");
  const [currentTime, setCurrentTime] = useState<string>("");

  // Actualizar la zona seleccionada cuando se cargan los datos
  useEffect(() => {
    if (data?.timezone) {
      setSelectedTimezone(data.timezone);
    }
  }, [data?.timezone]);

  // Reloj en tiempo real con la zona seleccionada
  useEffect(() => {
    if (!selectedTimezone) return;

    const updateClock = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleString("es-CO", {
          timeZone: selectedTimezone,
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
        setCurrentTime(formatted);
      } catch {
        setCurrentTime("Zona horaria inválida");
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const handleSave = () => {
    if (!selectedTimezone) return;
    setTimezoneMutation.mutate({ timezone: selectedTimezone });
  };

  const hasChanged = data?.timezone !== selectedTimezone;

  if (isLoading) {
    return (
      <Card className="shadow-apple border-0">
        <CardContent className="pt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-apple border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Zona Horaria
        </CardTitle>
        <CardDescription>
          Configura la zona horaria de la aplicación. Afecta a todos los
          recordatorios, calendarios, hitos y notificaciones del sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reloj actual */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              Hora actual en la zona seleccionada
            </span>
          </div>
          <p className="text-lg font-semibold capitalize">{currentTime}</p>
        </div>

        {/* Selector de zona horaria */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Zona Horaria</label>
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {data?.timezones?.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <div className="flex items-center gap-2">
                    <span>{tz.label}</span>
                    {tz.value === data?.timezone && (
                      <Badge variant="secondary" className="text-xs">
                        Actual
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Identificador IANA: <code className="bg-muted px-1 rounded">{selectedTimezone}</code>
          </p>
        </div>

        {/* Información importante */}
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Importante</p>
            <p>
              Al cambiar la zona horaria, todas las comparaciones de fechas
              (hitos vencidos, recordatorios próximos, proyectos con retraso) se
              recalcularán usando la nueva zona. Las fechas almacenadas en la
              base de datos no se modifican.
            </p>
          </div>
        </div>

        {/* Botón guardar */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanged || setTimezoneMutation.isPending}
          >
            {setTimezoneMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Guardar Zona Horaria
              </>
            )}
          </Button>
          {!hasChanged && (
            <span className="text-sm text-muted-foreground">
              Sin cambios pendientes
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
