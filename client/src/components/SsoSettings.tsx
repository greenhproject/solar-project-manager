import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Plus, Copy, Check, RefreshCw, Trash2, Power, PowerOff, ExternalLink, Clock, Users, Key } from "lucide-react";

type RoleMapping = Record<string, string>;

export function SsoSettings() {

  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [showSecret, setShowSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [authModel, setAuthModel] = useState<"sso_jwt" | "sso_redirect" | "sso_action">("sso_jwt");
  const [roleMapping, setRoleMapping] = useState<RoleMapping>({
    admin: "admin",
    engineer: "gerente",
    ingeniero_tramites: "asesor_comercial",
    client: "client",
  });

  // Queries
  const { data: apps, isLoading } = trpc.ssoManagement.list.useQuery();
  const { data: stats } = trpc.ssoManagement.stats.useQuery();
  const { data: logs } = trpc.ssoManagement.accessLogs.useQuery(
    showLogs ? { appId: showLogs, limit: 20 } : { limit: 50 }
  );

  // Mutations
  const createMutation = trpc.ssoManagement.create.useMutation({
    onSuccess: (data) => {
      setShowSecret(data.ssoSecret);
      setCreateOpen(false);
      resetForm();
      utils.ssoManagement.list.invalidate();
      utils.ssoManagement.stats.invalidate();
      toast.success("App SSO creada. Guarda el secret, no se mostrará de nuevo.");
    },
    onError: (err) => {
      toast.error(err.message || "Error al crear app SSO");
    },
  });

  const activateMutation = trpc.ssoManagement.activate.useMutation({
    onSuccess: () => {
      utils.ssoManagement.list.invalidate();
      toast.success("App activada");
    },
  });

  const deactivateMutation = trpc.ssoManagement.deactivate.useMutation({
    onSuccess: () => {
      utils.ssoManagement.list.invalidate();
      toast.success("App desactivada");
    },
  });

  const deleteMutation = trpc.ssoManagement.delete.useMutation({
    onSuccess: () => {
      utils.ssoManagement.list.invalidate();
      utils.ssoManagement.stats.invalidate();
      toast.success("App eliminada");
    },
  });

  const regenerateSecretMutation = trpc.ssoManagement.regenerateSecret.useMutation({
    onSuccess: (data) => {
      setShowSecret(data.ssoSecret);
      toast.success("Secret regenerado. Actualiza la configuración en la app destino.");
    },
  });

  function resetForm() {
    setName("");
    setSlug("");
    setDescription("");
    setUrl("");
    setCallbackUrl("");
    setAuthModel("sso_jwt");
    setRoleMapping({ admin: "admin", engineer: "gerente", ingeniero_tramites: "asesor_comercial", client: "client" });
  }

  function handleCreate() {
    if (!name || !slug || !url) {
      toast.error("Nombre, slug y URL son requeridos");
      return;
    }
    createMutation.mutate({
      name,
      slug,
      url,
      callbackUrl: callbackUrl || undefined,
      description: description || undefined,
      authModel,
      roleMapping,
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const authModelLabels: Record<string, string> = {
    sso_jwt: "SSO JWT",
    sso_redirect: "SSO Redirect",
    sso_action: "SSO Action + JWT",
  };

  // SSO Config query
  const { data: ssoConfig, isLoading: ssoConfigLoading } = trpc.appSettings.getSsoConfig.useQuery();
  const saveSsoConfigMutation = trpc.appSettings.setSsoConfig.useMutation({
    onSuccess: () => {
      utils.appSettings.getSsoConfig.invalidate();
      toast.success("Configuración SSO guardada correctamente");
      setEditingSecret(false);
    },
    onError: (err) => toast.error(err.message || "Error al guardar configuración SSO"),
  });

  const [editingSecret, setEditingSecret] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showFullSecret, setShowFullSecret] = useState(false);

  function copyCallbackUrl() {
    const url = ssoConfig?.callbackUrl || "https://spm.ghp.center/api/sso/callback";
    navigator.clipboard.writeText(url);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
    toast.success("URL de Callback copiada");
  }

  function copySecret() {
    if (ssoConfig?.ssoSecret) {
      navigator.clipboard.writeText(ssoConfig.ssoSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
      toast.success("Secret copiado al portapapeles");
    }
  }

  function handleSaveSecret() {
    if (!newSecret.trim()) {
      toast.error("El secret no puede estar vacío");
      return;
    }
    saveSsoConfigMutation.mutate({ ssoSecret: newSecret.trim() });
  }

  return (
    <div className="space-y-6">
      {/* Credenciales SSO - URL de Callback y Secret */}
      <Card className="shadow-apple border-0">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 shrink-0">
              <Key className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Credenciales SSO</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Comparte estos datos con el Hub GHP para configurar la conexión SSO hacia esta aplicación.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL de Callback */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">URL de Callback SSO</Label>
            <p className="text-xs text-muted-foreground">Esta es la URL que el Hub debe usar para redirigir usuarios autenticados a esta app.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2.5 rounded text-xs sm:text-sm font-mono break-all border">
                {ssoConfig?.callbackUrl || "https://spm.ghp.center/api/sso/callback"}
              </code>
              <Button size="sm" variant="outline" onClick={copyCallbackUrl} className="shrink-0">
                {copiedCallback ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Secret compartido */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Secret Compartido (CRM_SSO_SECRET)</Label>
            <p className="text-xs text-muted-foreground">
              El Hub firma los tokens JWT con este secret. Debe ser el mismo valor en ambas aplicaciones.
              {ssoConfig?.source === "database" && <Badge variant="outline" className="ml-2 text-[10px]">Guardado en BD</Badge>}
              {ssoConfig?.source === "env" && <Badge variant="outline" className="ml-2 text-[10px]">Variable de entorno</Badge>}
            </p>
            
            {ssoConfig?.ssoSecretConfigured && !editingSecret ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2.5 rounded text-xs sm:text-sm font-mono border">
                    {showFullSecret ? ssoConfig.ssoSecret : ssoConfig.ssoSecretPreview}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => setShowFullSecret(!showFullSecret)} className="shrink-0 text-xs">
                    {showFullSecret ? "Ocultar" : "Ver"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={copySecret} className="shrink-0">
                    {copiedSecret ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { setEditingSecret(true); setNewSecret(""); }} className="text-xs text-orange-600">
                  <RefreshCw className="h-3 w-3 mr-1" /> Cambiar Secret
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="password"
                    placeholder="Pega aquí el secret compartido con el Hub..."
                    value={newSecret}
                    onChange={e => setNewSecret(e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveSecret}
                    disabled={saveSsoConfigMutation.isPending || !newSecret.trim()}
                    className="bg-green-600 hover:bg-green-700 shrink-0"
                  >
                    {saveSsoConfigMutation.isPending ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
                {editingSecret && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingSecret(false)} className="text-xs">
                    Cancelar
                  </Button>
                )}
                {!ssoConfig?.ssoSecretConfigured && (
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Secret no configurado. El SSO no funcionará hasta que lo configures.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Header con estadísticas */}
      <Card className="shadow-apple border-0">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 shrink-0">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Single Sign-On (SSO)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configura qué aplicaciones usan SSO automático.
                  Cuando está activo, al hacer clic en la tarjeta del Dashboard los usuarios son autenticados directamente con su cuenta GHP sin ingresar credenciales adicionales.
                </CardDescription>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" /> Nueva App
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle>Registrar App SSO</DialogTitle>
                  <DialogDescription>
                    Configura una nueva aplicación para autenticación SSO
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input placeholder="CRM GHP" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug (ID único) *</Label>
                      <Input placeholder="crm-ghp" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>URL de la App *</Label>
                    <Input placeholder="https://crm.ghp.center" value={url} onChange={e => setUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Callback SSO (opcional)</Label>
                    <Input placeholder="https://crm.ghp.center/api/sso/callback" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea placeholder="Descripción de la app..." value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo de Autenticación</Label>
                    <Select value={authModel} onValueChange={(v: any) => setAuthModel(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sso_jwt">SSO JWT - Token firmado con secret compartido</SelectItem>
                        <SelectItem value="sso_redirect">SSO Redirect - Redirige con token temporal</SelectItem>
                        <SelectItem value="sso_action">SSO Action - Autenticación automática con JWT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mapeo de Roles</Label>
                    <p className="text-xs text-muted-foreground">Define cómo se traducen los roles del Hub a la app destino</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium text-muted-foreground">Rol en Hub</div>
                      <div className="font-medium text-muted-foreground">Rol en App</div>
                      {Object.entries(roleMapping).map(([key, value]) => (
                        <div key={key} className="contents">
                          <div className="flex items-center">
                            <Badge variant="outline" className="text-xs">{key}</Badge>
                          </div>
                          <Input
                            className="h-8 text-sm"
                            value={value}
                            onChange={e => setRoleMapping(prev => ({ ...prev, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creando..." : "Crear App"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Info box */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">¿Cómo funciona?</h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
              <li>El Hub genera un token JWT firmado con el secret compartido</li>
              <li>El token tiene duración de 5 minutos para mayor seguridad</li>
              <li>La aplicación destino verifica el token con el secret compartido</li>
              <li>El usuario queda autenticado automáticamente con su rol correspondiente</li>
            </ol>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              El secret JWT se configura en el servidor como variable de entorno <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">CRM_SSO_SECRET</code>
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
              <div className="text-center p-2 sm:p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold">{stats.totalApps}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Apps</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.activeApps}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Activas</div>
              </div>
              <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.totalAccesses}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">Accesos</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secret reveal dialog */}
      {showSecret && (
        <Card className="shadow-apple border-2 border-yellow-400 dark:border-yellow-600">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Secret Generado (Solo se muestra una vez)</h4>
                <p className="text-xs text-muted-foreground mb-2">Copia y guarda este secret. Configúralo como variable de entorno en la app destino.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono break-all">
                    {showSecret}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(showSecret)}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setShowSecret(null)}>
                  Cerrar (ya lo copié)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Apps SSO */}
      <Card className="shadow-apple border-0">
        <CardHeader>
          <CardTitle className="text-lg">Aplicaciones Externas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : !apps || apps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay aplicaciones SSO registradas. Haz clic en "Nueva App" para agregar una.
            </div>
          ) : (
            <div className="space-y-3">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 mt-1 sm:mt-0 ${app.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                        <span className="font-medium text-sm sm:text-base">{app.name}</span>
                        <Badge variant={app.isActive ? "default" : "secondary"} className="text-[10px] sm:text-xs">
                          {app.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {authModelLabels[app.authModel] || app.authModel}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground mt-1">
                        <a href={app.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-500 truncate max-w-[200px] sm:max-w-none">
                          {app.url} <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {app.totalAccesses}
                        </span>
                        {app.lastAccessAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(app.lastAccessAt).toLocaleDateString("es-CO")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowLogs(showLogs === app.id ? null : app.id)}
                      title="Ver historial"
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => regenerateSecretMutation.mutate({ id: app.id })}
                      title="Regenerar secret"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    {app.isActive ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deactivateMutation.mutate({ id: app.id })}
                        title="Desactivar"
                      >
                        <PowerOff className="h-4 w-4 text-orange-500" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => activateMutation.mutate({ id: app.id })}
                        title="Activar"
                        className="text-green-600"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("¿Eliminar esta app SSO? Esta acción no se puede deshacer.")) {
                          deleteMutation.mutate({ id: app.id });
                        }
                      }}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mapeo de Roles */}
      {apps && apps.length > 0 && (
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="text-lg">Mapeo de Roles Hub → Apps</CardTitle>
            <CardDescription>
              El mapeo de roles se aplica automáticamente al generar el token. Los permisos se asignan según el rol del usuario en el Hub.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Rol en Hub</th>
                    {apps.filter(a => a.isActive).map(app => (
                      <th key={app.id} className="text-left py-2 px-3 font-medium">{app.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {["admin", "engineer", "ingeniero_tramites", "client"].map(role => (
                    <tr key={role} className="border-b">
                      <td className="py-2 px-3">
                        <Badge variant="outline">{role}</Badge>
                      </td>
                      {apps.filter(a => a.isActive).map(app => (
                        <td key={app.id} className="py-2 px-3">
                          <Badge variant="secondary" className="text-xs">
                            {(app.roleMapping as RoleMapping)?.[role] || role}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de Accesos SSO */}
      <Card className="shadow-apple border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Historial de Accesos SSO</CardTitle>
            {showLogs && (
              <Button size="sm" variant="outline" onClick={() => setShowLogs(null)}>
                Ver todos
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No se han registrado accesos SSO todavía
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 px-3 border-b last:border-0 gap-1">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${log.success ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block">{log.userName || log.userEmail}</span>
                      <span className="text-xs text-muted-foreground block sm:hidden truncate">{log.userEmail}</span>
                      <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">{log.userEmail}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-3 text-xs text-muted-foreground pl-4 sm:pl-0">
                    <Badge variant="outline" className="text-[10px] sm:text-xs">{log.appName || "App"}</Badge>
                    {log.mappedRole && <Badge variant="secondary" className="text-[10px] sm:text-xs">{log.mappedRole}</Badge>}
                    <span className="text-[10px] sm:text-xs">{new Date(log.accessedAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
