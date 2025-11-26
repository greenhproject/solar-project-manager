import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Wrench } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Configuración
        </h1>
        <p className="text-gray-600 mt-2">
          Administra las opciones del sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Configuración del Sistema</CardTitle>
              <CardDescription>Próximamente disponible</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Esta sección permitirá configurar tipos de proyectos, plantillas de hitos,
            y otras opciones del sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
