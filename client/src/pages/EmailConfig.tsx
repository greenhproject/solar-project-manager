import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useTimezone } from "@/hooks/useTimezone";

import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Settings,
  Send,
  Shield,
  Server,
  Key,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";

type Provider = "resend" | "sendgrid" | "smtp";

interface EmailConfigForm {
  provider: Provider;
  apiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
  fromEmail: string;
  fromName: string;
  enableEmailNotifications: boolean;
  sendCopyToAdmin: boolean;
  adminEmail: string;
  isActive: boolean;
}

const defaultForm: EmailConfigForm = {
  provider: "resend",
  apiKey: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  smtpSecure: true,
  fromEmail: "admin@greenhproject.com",
  fromName: "Solar Project Manager",
  enableEmailNotifications: true,
  sendCopyToAdmin: true,
  adminEmail: "admin@greenhproject.com",
  isActive: false,
};

const providerInfo: Record<Provider, { name: string; description: string; icon: React.ReactNode }> = {
  resend: {
    name: "Resend",
    description: "API moderna y fácil de usar para envío de emails transaccionales",
    icon: <Mail className="h-5 w-5" />,
  },
  sendgrid: {
    name: "SendGrid",
    description: "Plataforma robusta de email de Twilio con alta entregabilidad",
    icon: <Send className="h-5 w-5" />,
  },
  smtp: {
    name: "SMTP Genérico",
    description: "Conexión directa a cualquier servidor SMTP (Gmail, Outlook, etc.)",
    icon: <Server className="h-5 w-5" />,
  },
};

export default function EmailConfigPage() {
  const { formatDateTime: tzFormatDateTime } = useTimezone();
  const [, navigate] = useLocation();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const user = meQuery.data ?? null;
  const [form, setForm] = useState<EmailConfigForm>(defaultForm);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Verificar que sea admin
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">Solo los administradores pueden acceder a la configuración de email.</p>
            <Button onClick={() => navigate("/dashboard")} className="mt-4">
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Obtener configuración actual
  const { data: config, isLoading } = trpc.emailConfig.get.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Mutaciones
  const updateConfig = trpc.emailConfig.update.useMutation({
    onSuccess: () => {
      toast.success("Configuración de email guardada correctamente");
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
      setIsSaving(false);
    },
  });

  const sendTest = trpc.emailConfig.sendTest.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Email de prueba enviado correctamente. Revisa tu bandeja de entrada.");
      } else {
        toast.error("No se pudo enviar el email de prueba. Verifica la configuración.");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Cargar configuración existente
  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider as Provider,
        apiKey: config.apiKey || "",
        smtpHost: config.smtpHost || "",
        smtpPort: config.smtpPort || 587,
        smtpUser: config.smtpUser || "",
        smtpPassword: config.smtpPassword || "",
        smtpSecure: config.smtpSecure ?? true,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        enableEmailNotifications: config.enableEmailNotifications,
        sendCopyToAdmin: config.sendCopyToAdmin,
        adminEmail: config.adminEmail || "",
        isActive: config.isActive,
      });
    }
  }, [config]);

  const handleSave = () => {
    setIsSaving(true);
    updateConfig.mutate({
      provider: form.provider,
      apiKey: form.apiKey || null,
      smtpHost: form.smtpHost || null,
      smtpPort: form.smtpPort || null,
      smtpUser: form.smtpUser || null,
      smtpPassword: form.smtpPassword || null,
      smtpSecure: form.smtpSecure,
      fromEmail: form.fromEmail,
      fromName: form.fromName,
      enableEmailNotifications: form.enableEmailNotifications,
      sendCopyToAdmin: form.sendCopyToAdmin,
      adminEmail: form.adminEmail || null,
      isActive: form.isActive,
    });
  };

  const handleSendTest = () => {
    if (!testEmail) {
      toast.error("Ingresa un email para la prueba");
      return;
    }
    if (!form.isActive) {
      toast.error("Activa el servicio de email antes de enviar una prueba");
      return;
    }
    sendTest.mutate({ email: testEmail });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Configuración
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Mail className="h-8 w-8 text-orange-500" />
              Configuración de Email
            </h1>
            <p className="text-gray-600 mt-1">
              Configura el proveedor de email para notificaciones automáticas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {form.isActive ? (
                <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Activo
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Inactivo
                </Badge>
              )}
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
            />
          </div>
        </div>

        {/* Proveedor */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-orange-500" />
              Proveedor de Email
            </CardTitle>
            <CardDescription>
              Selecciona el servicio que deseas usar para enviar correos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(providerInfo) as Provider[]).map((key) => {
                const info = providerInfo[key];
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      form.provider === key
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setForm({ ...form, provider: key })}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${
                        form.provider === key ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-600"
                      }`}>
                        {info.icon}
                      </div>
                      <h3 className="font-semibold">{info.name}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Credenciales */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              Credenciales
            </CardTitle>
            <CardDescription>
              {form.provider === "smtp"
                ? "Configura los datos de conexión SMTP"
                : `Ingresa tu API Key de ${providerInfo[form.provider].name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.provider !== "smtp" ? (
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative mt-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={form.apiKey}
                    onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                    placeholder={`Ingresa tu API Key de ${providerInfo[form.provider].name}`}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {form.provider === "resend"
                    ? "Obtén tu API Key en https://resend.com/api-keys"
                    : "Obtén tu API Key en https://app.sendgrid.com/settings/api_keys"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="smtpHost">Servidor SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={form.smtpHost}
                    onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">Puerto</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) => setForm({ ...form, smtpPort: parseInt(e.target.value) || 587 })}
                    placeholder="587"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpUser">Usuario</Label>
                  <Input
                    id="smtpUser"
                    value={form.smtpUser}
                    onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                    placeholder="tu@email.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPassword">Contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      id="smtpPassword"
                      type={showSmtpPassword ? "text" : "password"}
                      value={form.smtpPassword}
                      onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
                      placeholder="Contraseña o App Password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <Switch
                    checked={form.smtpSecure}
                    onCheckedChange={(checked) => setForm({ ...form, smtpSecure: checked })}
                  />
                  <Label>Conexión segura (TLS/SSL)</Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remitente */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-orange-500" />
              Configuración del Remitente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName">Nombre del Remitente</Label>
                <Input
                  id="fromName"
                  value={form.fromName}
                  onChange={(e) => setForm({ ...form, fromName: e.target.value })}
                  placeholder="Solar Project Manager"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">Email del Remitente</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={form.fromEmail}
                  onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  placeholder="admin@greenhproject.com"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opciones */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-500" />
              Opciones de Notificación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Habilitar notificaciones por email</Label>
                <p className="text-sm text-gray-500">Enviar emails automáticos cuando hay hitos próximos a vencer o vencidos</p>
              </div>
              <Switch
                checked={form.enableEmailNotifications}
                onCheckedChange={(checked) => setForm({ ...form, enableEmailNotifications: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enviar copia al administrador</Label>
                <p className="text-sm text-gray-500">Recibir una copia de cada notificación enviada para trazabilidad</p>
              </div>
              <Switch
                checked={form.sendCopyToAdmin}
                onCheckedChange={(checked) => setForm({ ...form, sendCopyToAdmin: checked })}
              />
            </div>

            {form.sendCopyToAdmin && (
              <div>
                <Label htmlFor="adminEmail">Email del Administrador</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="admin@greenhproject.com"
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email de Prueba */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              Email de Prueba
            </CardTitle>
            <CardDescription>
              Envía un email de prueba para verificar que la configuración funciona correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1"
              />
              <Button
                onClick={handleSendTest}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                disabled={sendTest.isPending || !form.isActive}
              >
                {sendTest.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Prueba
              </Button>
            </div>
            {config?.lastTestedAt && (
              <p className="text-xs text-gray-500 mt-2">
                Último test: {tzFormatDateTime(config.lastTestedAt)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Botón Guardar */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/settings")}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </div>
    </div>
  );
}
