import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

/**
 * Solar Project Manager recibe una pareja emitida por GHP Soporte. Los valores
 * se pueden pegar una vez desde esta pantalla administrativa; el backend los
 * cifra antes de persistirlos y jamás los vuelve a entregar al navegador.
 */
export function SupportTicketsIntegrationSettings() {
  const utils = trpc.useUtils();
  const { data: configuration, isLoading } = trpc.supportTickets.getConfiguration.useQuery();
  const { data: projects = [] } = trpc.projects.list.useQuery();
  const [enabled, setEnabled] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [sourceKey, setSourceKey] = useState("");
  const [signingSecret, setSigningSecret] = useState("");
  const [testProjectId, setTestProjectId] = useState("");

  useEffect(() => {
    if (!configuration) return;
    setEnabled(configuration.enabled);
    setApiUrl(configuration.apiUrl);
  }, [configuration]);

  const saveConfiguration = trpc.supportTickets.saveConfiguration.useMutation({
    onSuccess: () => {
      setSourceKey("");
      setSigningSecret("");
      utils.supportTickets.getConfiguration.invalidate();
      toast.success("Configuración de tickets de Soporte guardada de forma cifrada");
    },
    onError: error => toast.error(error.message || "No fue posible guardar la configuración"),
  });
  const testConfiguration = trpc.supportTickets.testConfiguration.useMutation({
    onSuccess: result => {
      utils.supportTickets.getConfiguration.invalidate();
      toast.success(
        result.activeTicketCount > 0
          ? `Conexión segura validada: ${result.activeTicketCount} ticket(s) activo(s) para tu cuenta de prueba.`
          : "Conexión segura validada. No hay tickets activos asignados a tu cuenta en el proyecto de prueba.",
      );
    },
    onError: error => toast.error(error.message || "La prueba de conexión no fue exitosa"),
  });

  const hasCredentialInput = Boolean(sourceKey.trim() || signingSecret.trim());
  const hasUnsavedChanges = configuration
    ? enabled !== configuration.enabled || apiUrl.trim() !== configuration.apiUrl || hasCredentialInput
    : hasCredentialInput;
  const projectsWithOpenSolar = projects.filter(project => Boolean(project.openSolarId));
  const canTest = Boolean(
    configuration?.enabled &&
    configuration?.credentialsConfigured &&
    Number(testProjectId) > 0,
  );
  const credentialStatus = useMemo(() => {
    if (configuration?.credentialsSource === "encrypted_database") {
      return { label: "Guardadas con cifrado", className: "text-emerald-700 dark:text-emerald-300" };
    }
    if (configuration?.credentialsSource === "railway") {
      return { label: "Configuradas en Railway", className: "text-emerald-700 dark:text-emerald-300" };
    }
    if (configuration?.credentialsSource === "invalid") {
      return { label: "Credenciales cifradas no válidas", className: "text-destructive" };
    }
    return { label: "Pendientes de configurar", className: "text-amber-700 dark:text-amber-300" };
  }, [configuration?.credentialsSource]);

  function handleSave() {
    const normalizedSourceKey = sourceKey.trim();
    const normalizedSigningSecret = signingSecret.trim();
    if (Boolean(normalizedSourceKey) !== Boolean(normalizedSigningSecret)) {
      toast.error("Pega la clave de origen y el secreto HMAC juntos");
      return;
    }
    saveConfiguration.mutate({
      enabled,
      apiUrl: apiUrl.trim(),
      ...(normalizedSourceKey && normalizedSigningSecret
        ? { sourceKey: normalizedSourceKey, signingSecret: normalizedSigningSecret }
        : {}),
    });
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Cargando integración de tickets…</div>;
  }

  return (
    <Card className="border-0 shadow-apple">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <PlugZap className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg sm:text-xl">Tickets de Soporte por Proyecto</CardTitle>
              <Badge variant={configuration?.enabled ? "default" : "secondary"}>
                {configuration?.enabled ? "Activa" : "Desactivada"}
              </Badge>
              <Badge variant={configuration?.credentialsConfigured ? "outline" : "destructive"}>
                {configuration?.credentialsConfigured ? "Credenciales de servidor listas" : "Credenciales pendientes"}
              </Badge>
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Muestra en cada proyecto solo los tickets activos asignados al mismo correo corporativo.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5" aria-labelledby="support-credentials-title">
          <div className="flex gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="support-credentials-title" className="font-semibold">Credenciales emitidas por GHP Soporte</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Genera la pareja en <strong>GHP Soporte → Configuración → Integraciones</strong> y pega aquí el bloque de Solar Project Manager. Al guardar, los valores se cifran con AES-256-GCM antes de llegar a la base de datos.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="support-tickets-source-key">Clave de origen</Label>
              <Input
                id="support-tickets-source-key"
                value={sourceKey}
                onChange={event => setSourceKey(event.target.value)}
                placeholder="spm_…"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">Solo se usa para actualizar la configuración; no se vuelve a mostrar.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-tickets-signing-secret">Secreto HMAC</Label>
              <Input
                id="support-tickets-signing-secret"
                type="password"
                value={signingSecret}
                onChange={event => setSigningSecret(event.target.value)}
                placeholder="Pega el secreto emitido por Soporte"
                autoComplete="new-password"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">Debe pegarse junto con la clave de origen; se cifra antes de persistir.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-background/80 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground"><LockKeyhole className="h-3.5 w-3.5" /> Estado:</span>
            <strong className={credentialStatus.className}>{credentialStatus.label}</strong>
            {configuration?.credentialsUpdatedAt && configuration?.credentialsSource === "encrypted_database" && (
              <span className="text-muted-foreground">Actualizadas: {new Date(configuration.credentialsUpdatedAt).toLocaleString()}</span>
            )}
          </div>

          {!configuration?.credentialsVaultReady && (
            <div className="mt-3 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-muted-foreground">
                Antes de guardar, configura <code>SUPPORT_TICKETS_CREDENTIAL_ENCRYPTION_KEY</code> como secreto privado de Railway para este backend.
              </p>
            </div>
          )}
        </section>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p className="text-muted-foreground">
              Los secretos guardados nunca se muestran ni se devuelven al navegador. Para rotarlos, genera una nueva pareja en GHP Soporte y pega ambos valores de nuevo.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div className="min-w-0">
            <Label htmlFor="support-tickets-enabled" className="font-medium">Activar avisos de tickets de servicio</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Al desactivarlo, Solar Project Manager no consulta ni muestra tickets de Soporte.
            </p>
          </div>
          <Switch
            id="support-tickets-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Activar integración de tickets de Soporte"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-tickets-api-url">URL del backend de Soporte</Label>
          <Input
            id="support-tickets-api-url"
            type="url"
            inputMode="url"
            value={apiUrl}
            onChange={event => setApiUrl(event.target.value)}
            placeholder="https://soporte-backend-ghp-production.up.railway.app"
          />
          <p className="text-xs text-muted-foreground">
            Debe ser una URL HTTPS base, sin rutas, parámetros ni fragmentos.
          </p>
        </div>

        {!configuration?.credentialsConfigured && (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-muted-foreground">
              Pega los dos valores emitidos por GHP Soporte y guarda los cambios antes de activar la integración.
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-lg border p-4">
          <Label htmlFor="support-tickets-test-project">Proyecto para prueba controlada</Label>
          <Select value={testProjectId} onValueChange={setTestProjectId}>
            <SelectTrigger id="support-tickets-test-project">
              <SelectValue placeholder="Selecciona un proyecto con ID de OpenSolar" />
            </SelectTrigger>
            <SelectContent>
              {projectsWithOpenSolar.map(project => (
                <SelectItem key={project.id} value={String(project.id)}>
                  {project.name} · OpenSolar {project.openSolarId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            La prueba usa este proyecto, pero mantiene el filtro de tu propio correo corporativo.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => {
              if (hasUnsavedChanges) {
                toast.error("Guarda los cambios antes de probar la conexión");
                return;
              }
              testConfiguration.mutate({ projectId: Number(testProjectId) });
            }}
            disabled={!canTest || testConfiguration.isPending}
            className="gap-2"
          >
            {testConfiguration.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlugZap className="h-4 w-4" />}
            Probar conexión
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveConfiguration.isPending || !hasUnsavedChanges}
            className="gap-2"
          >
            {saveConfiguration.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </Button>
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
          La prueba confirma la firma servidor a servidor usando un proyecto de Solar Project Manager. Solo devuelve tickets que estén asignados a tu propio correo.
        </p>
      </CardContent>
    </Card>
  );
}
