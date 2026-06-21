import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Shield, Plus, Copy, Check, RefreshCw, Trash2, ExternalLink, Clock, Users, Key, Eye, EyeOff, Settings2, History } from "lucide-react";

type RoleMapping = Record<string, string>;

export function SsoSettings() {
  const utils = trpc.useUtils();

  // UI state
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [createMode, setCreateMode] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSecretFor, setShowSecretFor] = useState<number | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

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

  // SSO Config (receptor)
  const { data: ssoConfig } = trpc.appSettings.getSsoConfig.useQuery();
  const saveSsoConfigMutation = trpc.appSettings.setSsoConfig.useMutation({
    onSuccess: () => {
      utils.appSettings.getSsoConfig.invalidate();
      toast.success("Secret SSO guardado correctamente");
      setEditingReceiverSecret(false);
    },
    onError: (err) => toast.error(err.message || "Error al guardar"),
  });
  const [editingReceiverSecret, setEditingReceiverSecret] = useState(false);
  const [newReceiverSecret, setNewReceiverSecret] = useState("");
  const [showReceiverSecret, setShowReceiverSecret] = useState(false);

  // Queries
  const { data: apps, isLoading } = trpc.ssoManagement.list.useQuery();
  const { data: stats } = trpc.ssoManagement.stats.useQuery();
  const { data: logs } = trpc.ssoManagement.accessLogs.useQuery({ limit: 30 });

  // Mutations
  const createMutation = trpc.ssoManagement.create.useMutation({
    onSuccess: (data) => {
      setRevealedSecret(data.ssoSecret);
      setCreateMode(false);
      setManageOpen(false);
      resetForm();
      utils.ssoManagement.list.invalidate();
      utils.ssoManagement.stats.invalidate();
      toast.success("App SSO creada exitosamente");
    },
    onError: (err) => toast.error(err.message || "Error al crear app"),
  });

  const activateMutation = trpc.ssoManagement.activate.useMutation({
    onSuccess: () => {
      utils.ssoManagement.list.invalidate();
      utils.ssoManagement.stats.invalidate();
      toast.success("App SSO activada");
    },
  });

  const deactivateMutation = trpc.ssoManagement.deactivate.useMutation({
    onSuccess: () => {
      utils.ssoManagement.list.invalidate();
      utils.ssoManagement.stats.invalidate();
      toast.success("App SSO desactivada");
    },
  });

  const deleteMutation = trpc.ssoManagement.delete.useMutation({
    onSuccess: () => {
      utils.ssoManagement.list.invalidate();
      utils.ssoManagement.stats.invalidate();
      setManageOpen(false);
      setSelectedApp(null);
      toast.success("App eliminada");
    },
  });

  const regenerateSecretMutation = trpc.ssoManagement.regenerateSecret.useMutation({
    onSuccess: (data) => {
      setRevealedSecret(data.ssoSecret);
      utils.ssoManagement.list.invalidate();
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
    createMutation.mutate({ name, slug, url, callbackUrl: callbackUrl || undefined, description: description || undefined, authModel, roleMapping });
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast.success(`${label} copiado`);
  }

  function openManageApp(app: any) {
    setSelectedApp(app);
    setCreateMode(false);
    setManageOpen(true);
  }

  function openCreateApp() {
    setSelectedApp(null);
    setCreateMode(true);
    resetForm();
    setManageOpen(true);
  }

  const authModelLabels: Record<string, string> = {
    sso_jwt: "SSO JWT",
    sso_redirect: "SSO Redirect",
    sso_action: "SSO Action",
  };

  const callbackUrlValue = ssoConfig?.callbackUrl || "https://spm.ghp.center/api/sso/callback";

  return (
    <div className="space-y-6">
      {/* Panel Principal SSO Unificado */}
      <Card className="shadow-apple border-0">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 shrink-0">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg sm:text-xl">Single Sign-On (SSO)</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Configura la autenticación SSO para conectar con el Hub GHP y aplicaciones externas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Credenciales de Conexión */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Key className="h-4 w-4 text-green-600" />
              Credenciales de Conexión
            </h3>

            {/* URL de Callback */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">URL de Callback</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white dark:bg-gray-900 p-2.5 rounded-lg text-xs font-mono break-all border">
                  {callbackUrlValue}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyText(callbackUrlValue, "URL")} className="shrink-0 h-9 w-9 p-0">
                  {copied === "URL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Secret Compartido */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Secret Compartido (CRM_SSO_SECRET)</Label>
              {ssoConfig?.ssoSecretConfigured && !editingReceiverSecret ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-gray-900 p-2.5 rounded-lg text-xs font-mono border truncate">
                      {showReceiverSecret ? ssoConfig.ssoSecret : ssoConfig.ssoSecretPreview}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => setShowReceiverSecret(!showReceiverSecret)} className="shrink-0 h-9 w-9 p-0">
                      {showReceiverSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyText(ssoConfig.ssoSecret || "", "Secret")} className="shrink-0 h-9 w-9 p-0">
                      {copied === "Secret" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {ssoConfig.source === "database" ? "Guardado en BD" : "Variable de entorno"}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingReceiverSecret(true); setNewReceiverSecret(""); }} className="text-xs text-orange-600 h-6 px-2">
                      <RefreshCw className="h-3 w-3 mr-1" /> Cambiar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Pega el secret compartido del Hub..."
                      value={newReceiverSecret}
                      onChange={e => setNewReceiverSecret(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => saveSsoConfigMutation.mutate({ ssoSecret: newReceiverSecret.trim() })}
                      disabled={saveSsoConfigMutation.isPending || !newReceiverSecret.trim()}
                      className="bg-green-600 hover:bg-green-700 shrink-0"
                    >
                      {saveSsoConfigMutation.isPending ? "..." : "Guardar"}
                    </Button>
                  </div>
                  {editingReceiverSecret && (
                    <Button size="sm" variant="ghost" onClick={() => setEditingReceiverSecret(false)} className="text-xs h-6 px-2">
                      Cancelar
                    </Button>
                  )}
                  {!ssoConfig?.ssoSecretConfigured && (
                    <p className="text-xs text-orange-600 flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Sin configurar. El SSO no funcionará hasta que guardes el secret.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats rápidos */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="text-xl font-bold">{stats.totalApps}</div>
                <div className="text-[10px] text-muted-foreground">Apps</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <div className="text-xl font-bold text-green-600">{stats.activeApps}</div>
                <div className="text-[10px] text-muted-foreground">Activas</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <div className="text-xl font-bold text-blue-600">{stats.totalAccesses}</div>
                <div className="text-[10px] text-muted-foreground">Accesos</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Secret revelado después de crear/regenerar */}
      {revealedSecret && (
        <Card className="border-2 border-yellow-400 dark:border-yellow-600 shadow-apple">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm">Secret Generado</h4>
                <p className="text-xs text-muted-foreground mb-2">Copia este secret ahora. No se mostrará de nuevo.</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-gray-800 p-2.5 rounded-lg text-xs font-mono break-all border">
                    {revealedSecret}
                  </code>
                  <Button size="sm" variant="outline" onClick={() => copyText(revealedSecret, "Secret generado")} className="shrink-0 h-9 w-9 p-0">
                    {copied === "Secret generado" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setRevealedSecret(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aplicaciones Conectadas */}
      <Card className="shadow-apple border-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">Aplicaciones Conectadas</CardTitle>
            <Button size="sm" onClick={openCreateApp} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-1" /> Nueva App
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Cargando...</div>
          ) : !apps || apps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No hay aplicaciones registradas. Agrega una para habilitar SSO.
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-3 border rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer gap-3"
                  onClick={() => openManageApp(app)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${app.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{app.name}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {authModelLabels[app.authModel] || app.authModel}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">{app.url}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{app.totalAccesses} accesos</span>
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Unificado: Crear / Gestionar App */}
      <Dialog open={manageOpen} onOpenChange={(open) => { setManageOpen(open); if (!open) { setSelectedApp(null); setCreateMode(false); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>{createMode ? "Nueva Aplicación SSO" : selectedApp?.name}</DialogTitle>
            <DialogDescription>
              {createMode ? "Registra una nueva app para autenticación SSO" : "Gestiona la configuración de esta aplicación"}
            </DialogDescription>
          </DialogHeader>

          {createMode ? (
            /* Formulario de Creación */
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input placeholder="CRM GHP" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Slug (ID único) *</Label>
                  <Input placeholder="crm-ghp" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL de la App *</Label>
                <Input placeholder="https://crm.ghp.center" value={url} onChange={e => setUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">URL de Callback SSO (opcional)</Label>
                <Input placeholder="https://crm.ghp.center/api/sso/callback" value={callbackUrl} onChange={e => setCallbackUrl(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descripción</Label>
                <Textarea placeholder="Descripción..." value={description} onChange={e => setDescription(e.target.value)} className="h-16" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo de Autenticación</Label>
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
                <Label className="text-xs">Mapeo de Roles</Label>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Rol en Hub</div>
                  <div className="text-xs font-medium text-muted-foreground">Rol en App</div>
                  {Object.entries(roleMapping).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="flex items-center">
                        <Badge variant="outline" className="text-xs">{key}</Badge>
                      </div>
                      <Input className="h-8 text-xs" value={value} onChange={e => setRoleMapping(prev => ({ ...prev, [key]: e.target.value }))} />
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setManageOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  {createMutation.isPending ? "Creando..." : "Crear App"}
                </Button>
              </DialogFooter>
            </div>
          ) : selectedApp && (
            /* Panel de Gestión de App Existente */
            <div className="space-y-5 py-2">
              {/* Estado y Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${selectedApp.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                  <div>
                    <span className="text-sm font-medium">{selectedApp.isActive ? "Activa" : "Inactiva"}</span>
                    <p className="text-xs text-muted-foreground">{selectedApp.url}</p>
                  </div>
                </div>
                <Switch
                  checked={selectedApp.isActive}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      activateMutation.mutate({ id: selectedApp.id });
                      setSelectedApp({ ...selectedApp, isActive: true });
                    } else {
                      deactivateMutation.mutate({ id: selectedApp.id });
                      setSelectedApp({ ...selectedApp, isActive: false });
                    }
                  }}
                />
              </div>

              {/* Info de la App */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Modelo</span>
                    <Badge variant="outline">{authModelLabels[selectedApp.authModel] || selectedApp.authModel}</Badge>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Accesos totales</span>
                    <span className="font-medium">{selectedApp.totalAccesses}</span>
                  </div>
                </div>
                {selectedApp.callbackUrl && (
                  <div>
                    <span className="text-xs text-muted-foreground block">Callback URL</span>
                    <code className="text-xs font-mono break-all">{selectedApp.callbackUrl}</code>
                  </div>
                )}
              </div>

              {/* Secret de la App */}
              <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4 text-yellow-600" />
                    Secret de la App
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm("¿Regenerar el secret? Deberás actualizar la configuración en la app destino.")) {
                        regenerateSecretMutation.mutate({ id: selectedApp.id });
                      }
                    }}
                    className="h-7 text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Regenerar
                  </Button>
                </div>
                <code className="block bg-white dark:bg-gray-900 p-2 rounded text-xs font-mono border break-all">
                  {selectedApp.ssoSecretPreview || "••••••••"}
                </code>
                <p className="text-[10px] text-muted-foreground">
                  El secret completo solo se muestra al crear o regenerar.
                </p>
              </div>

              {/* Mapeo de Roles */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Mapeo de Roles</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-xs font-medium text-muted-foreground">Rol en Hub</div>
                  <div className="text-xs font-medium text-muted-foreground">Rol en {selectedApp.name}</div>
                  {Object.entries(selectedApp.roleMapping || {}).map(([key, value]) => (
                    <div key={key} className="contents">
                      <Badge variant="outline" className="text-xs w-fit">{key}</Badge>
                      <Badge variant="secondary" className="text-xs w-fit">{value as string}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`¿Eliminar "${selectedApp.name}"? Esta acción no se puede deshacer.`)) {
                      deleteMutation.mutate({ id: selectedApp.id });
                    }
                  }}
                  className="h-8 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setManageOpen(false)} className="h-8 text-xs">
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Historial de Accesos */}
      <Card className="shadow-apple border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Historial de Accesos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No se han registrado accesos SSO todavía
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${log.success ? "bg-green-500" : "bg-red-500"}`} />
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">{log.userName || log.userEmail}</span>
                      <span className="text-[10px] text-muted-foreground truncate block">{log.appName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.mappedRole && <Badge variant="secondary" className="text-[10px]">{log.mappedRole}</Badge>}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.accessedAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                    </span>
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
