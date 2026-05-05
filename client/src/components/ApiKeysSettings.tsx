import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Plus, Trash2, Key, Shield, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const AVAILABLE_PERMISSIONS = [
  { value: "*", label: "Acceso Total", description: "Todos los permisos" },
  { value: "projects:read", label: "Leer Proyectos", description: "Consultar proyectos y detalles" },
  { value: "milestones:read", label: "Leer Hitos", description: "Consultar hitos de proyectos" },
  { value: "milestones:write", label: "Escribir Hitos", description: "Actualizar estado de hitos" },
  { value: "stats:read", label: "Estadísticas", description: "Ver estadísticas generales" },
  { value: "admin", label: "Administrador", description: "Gestionar API Keys" },
];

export function ApiKeysSettings() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["*"]);
  const [expiresInDays, setExpiresInDays] = useState<string>("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const { data: keys, refetch } = trpc.apiKeyManagement.list.useQuery();
  const generateMutation = trpc.apiKeyManagement.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      refetch();
      toast.success("API Key generada. Copia la key antes de cerrar.");
    },
    onError: (err) => {
      toast.error(err.message || "Error al generar API Key");
    },
  });
  const deactivateMutation = trpc.apiKeyManagement.deactivate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API Key desactivada");
    },
  });
  const activateMutation = trpc.apiKeyManagement.activate.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API Key reactivada");
    },
  });
  const deleteMutation = trpc.apiKeyManagement.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API Key eliminada permanentemente");
    },
  });

  const handleGenerate = () => {
    if (!newKeyName.trim()) {
      toast.error("Ingresa un nombre para la API Key");
      return;
    }
    generateMutation.mutate({
      name: newKeyName.trim(),
      permissions: selectedPermissions,
      expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
    });
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const togglePermission = (perm: string) => {
    if (perm === "*") {
      setSelectedPermissions(["*"]);
      return;
    }
    // Si selecciona algo específico, quitar el wildcard
    let newPerms = selectedPermissions.filter(p => p !== "*");
    if (newPerms.includes(perm)) {
      newPerms = newPerms.filter(p => p !== perm);
    } else {
      newPerms.push(perm);
    }
    if (newPerms.length === 0) newPerms = ["*"];
    setSelectedPermissions(newPerms);
  };

  const resetCreateForm = () => {
    setNewKeyName("");
    setSelectedPermissions(["*"]);
    setExpiresInDays("");
    setGeneratedKey(null);
    setCopiedKey(false);
  };

  return (
    <Card className="shadow-apple border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              API Keys
            </CardTitle>
            <CardDescription>
              Gestiona las keys de acceso para integración con aplicaciones externas
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetCreateForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Nueva Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              {!generatedKey ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Generar Nueva API Key</DialogTitle>
                    <DialogDescription>
                      Crea una key para que aplicaciones externas accedan a la API REST.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="key-name">Nombre descriptivo</Label>
                      <Input
                        id="key-name"
                        placeholder="Ej: App Móvil, Integración CRM, Bot Telegram..."
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Permisos</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {AVAILABLE_PERMISSIONS.map((perm) => (
                          <label
                            key={perm.value}
                            className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedPermissions.includes(perm.value)
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.includes(perm.value)}
                              onChange={() => togglePermission(perm.value)}
                              className="rounded border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium">{perm.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">{perm.description}</span>
                            </div>
                            <code className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                              {perm.value}
                            </code>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expires">Expiración (días, vacío = no expira)</Label>
                      <Input
                        id="expires"
                        type="number"
                        placeholder="90"
                        value={expiresInDays}
                        onChange={(e) => setExpiresInDays(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                    <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                      {generateMutation.isPending ? "Generando..." : "Generar Key"}
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-600">
                      <Check className="h-5 w-5" /> API Key Generada
                    </DialogTitle>
                    <DialogDescription>
                      Copia esta key ahora. No podrás verla de nuevo después de cerrar este diálogo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Guarda esta key de forma segura. Una vez cierres este diálogo, no podrás recuperarla.
                      </p>
                    </div>
                    <div className="relative">
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                        {generatedKey}
                      </pre>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-7 w-7 p-0"
                        onClick={handleCopyKey}
                      >
                        {copiedKey ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Usa esta key en el header <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">X-API-Key</code> o como <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Bearer token</code>.
                      Documentación: <a href="/api-docs" className="text-orange-500 hover:underline">/api-docs</a>
                    </p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}>
                      Entendido, cerrar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!keys || keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay API Keys creadas</p>
            <p className="text-xs mt-1">Genera una key para integrar aplicaciones externas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key: any) => (
              <div
                key={key.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  key.isActive
                    ? "border-gray-200 dark:border-gray-700"
                    : "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 opacity-60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`p-2 rounded-lg ${key.isActive ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                    <Shield className={`h-4 w-4 ${key.isActive ? "text-green-600 dark:text-green-400" : "text-gray-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{key.name}</span>
                      <Badge variant={key.isActive ? "default" : "destructive"} className="text-xs">
                        {key.isActive ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{key.keyPreview}</code>
                      {key.lastUsedAt && (
                        <span>Último uso: {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      {key.expiresAt && (
                        <span className={new Date(key.expiresAt) < new Date() ? "text-red-500" : ""}>
                          Expira: {new Date(key.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(key.permissions as string[]).map((perm: string) => (
                        <span key={perm} className="text-[10px] bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {key.isActive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-amber-600 hover:text-amber-700"
                      onClick={() => deactivateMutation.mutate({ id: key.id })}
                      disabled={deactivateMutation.isPending}
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-green-600 hover:text-green-700"
                      onClick={() => activateMutation.mutate({ id: key.id })}
                      disabled={activateMutation.isPending}
                    >
                      Reactivar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    onClick={() => {
                      if (confirm("¿Eliminar esta API Key permanentemente?")) {
                        deleteMutation.mutate({ id: key.id });
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Link a documentación */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-muted-foreground">
            Documentación de la API: <a href="/api-docs" className="text-orange-500 hover:underline font-medium">/api-docs</a>
            {" · "}Base URL: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{window.location.origin}/api/v1</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
