import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useUnifiedAuth } from "@/_core/hooks/useUnifiedAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Upload,
  Camera,
  Bell,
  Settings,
  Lock,
  Key,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserProfile() {
  const { user } = useUnifiedAuth();
  const utils = trpc.useUtils();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Obtener configuración de notificaciones
  const { data: notifSettings, isLoading: isLoadingSettings } =
    trpc.notifications.getSettings.useQuery();

  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Contraseña actualizada exitosamente");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: error => {
      toast.error(error.message || "Error al cambiar la contraseña");
    },
  });

  const updateNotifSettings = trpc.notifications.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Preferencias actualizadas");
      utils.notifications.getSettings.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Error al actualizar preferencias");
    },
  });

  const uploadAvatar = trpc.users.uploadAvatar.useMutation({
    onSuccess: data => {
      toast.success("Avatar actualizado exitosamente");
      utils.auth.me.invalidate();
      setAvatarPreview(null);
    },
    onError: error => {
      toast.error(error.message || "Error al subir el avatar");
    },
  });

  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil actualizado exitosamente");
      setIsEditing(false);
      utils.auth.me.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Error al actualizar el perfil");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing) {
      return; // No hacer nada si no está en modo edición
    }

    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    console.log('[UserProfile] Submitting profile update:', { name: name.trim(), email: email.trim() });

    updateProfile.mutate({
      name: name.trim(),
      email: email.trim() || undefined,
    });
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setEmail(user?.email || "");
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona una imagen");
      return;
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 2MB.");
      return;
    }

    // Convertir a base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setAvatarPreview(base64String);

      // Subir inmediatamente
      uploadAvatar.mutate({
        imageData: base64String,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }

    // Validar longitud mínima
    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    changePassword.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
          <p className="text-gray-600">Administra tu información personal</p>
        </div>

        {/* Avatar */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-orange-500" />
              Foto de Perfil
            </CardTitle>
            <CardDescription>
              Haz clic en el avatar para cambiar tu foto
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              <Avatar
                className="h-24 w-24 border-4 border-orange-200 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleAvatarClick}
              >
                <AvatarImage
                  src={avatarPreview || user.avatarUrl || undefined}
                />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-400 text-white text-2xl font-semibold">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-2 shadow-lg transition-colors"
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">
                Formatos soportados: JPG, PNG, GIF
              </p>
              <p className="text-sm text-gray-600">Tamaño máximo: 2MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Información del Perfil */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Información Personal
            </CardTitle>
            <CardDescription>Actualiza tu nombre y email</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isEditing || updateProfile.isPending}
                  placeholder="Tu nombre completo"
                  className="bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={!isEditing || updateProfile.isPending}
                    placeholder="tu@email.com"
                    className="pl-10 bg-white"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {user.loginMethod === "oauth"
                    ? "Email proporcionado por OAuth (opcional)"
                    : "Email usado para iniciar sesión"}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                {!isEditing ? (
                  <Button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={updateProfile.isPending}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      {updateProfile.isPending
                        ? "Guardando..."
                        : "Guardar Cambios"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updateProfile.isPending}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preferencias de Notificaciones */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-purple-500" />
              Preferencias de Notificaciones
            </CardTitle>
            <CardDescription>
              Configura qué notificaciones deseas recibir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSettings ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : notifSettings ? (
              <>
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">
                      Notificaciones Push
                    </p>
                    <p className="text-sm text-gray-500">
                      Recibir notificaciones en tiempo real
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifSettings.enablePushNotifications}
                      onChange={e =>
                        updateNotifSettings.mutate({
                          enablePushNotifications: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">
                      Recordatorios de Hitos
                    </p>
                    <p className="text-sm text-gray-500">
                      Alertas cuando un hito está próximo a vencer
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifSettings.enableMilestoneReminders}
                      onChange={e =>
                        updateNotifSettings.mutate({
                          enableMilestoneReminders: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">
                      Alertas de Retrasos
                    </p>
                    <p className="text-sm text-gray-500">
                      Notificaciones de proyectos retrasados
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifSettings.enableDelayAlerts}
                      onChange={e =>
                        updateNotifSettings.mutate({
                          enableDelayAlerts: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <p className="font-medium text-gray-900">Alertas de IA</p>
                    <p className="text-sm text-gray-500">
                      Sugerencias y alertas generadas por IA
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifSettings.enableAIAlerts}
                      onChange={e =>
                        updateNotifSettings.mutate({
                          enableAIAlerts: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                <div className="pt-2">
                  <Label
                    htmlFor="reminderDays"
                    className="text-sm font-medium text-gray-900 mb-2 block"
                  >
                    Días de anticipación para recordatorios
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="reminderDays"
                      type="number"
                      min={1}
                      max={30}
                      value={notifSettings.milestoneReminderDays}
                      onChange={e => {
                        const days = parseInt(e.target.value);
                        if (days >= 1 && days <= 30) {
                          updateNotifSettings.mutate({
                            milestoneReminderDays: days,
                          });
                        }
                      }}
                      className="w-20"
                    />
                    <span className="text-sm text-gray-600">
                      Recibir recordatorios{" "}
                      {notifSettings.milestoneReminderDays} días antes del
                      vencimiento
                    </span>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* Selector de Tema */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-500" />
              Apariencia
            </CardTitle>
            <CardDescription>Elige el tema de la aplicación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Tema</Label>
                <Select
                  value={user.theme || "system"}
                  onValueChange={(value: "light" | "dark" | "system") => {
                    updateProfile.mutate({ theme: value });
                  }}
                >
                  <SelectTrigger id="theme" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        <span>Claro</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        <span>Oscuro</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        <span>Sistema</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {user.theme === "system"
                    ? "El tema se ajustará automáticamente según la configuración de tu sistema"
                    : user.theme === "dark"
                      ? "Tema oscuro activado"
                      : "Tema claro activado"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cambio de Contraseña - Solo para usuarios JWT */}
        {user.loginMethod === "jwt" && (
          <Card className="shadow-apple border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-500" />
                Cambiar Contraseña
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña de acceso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Contraseña Actual</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Ingresa tu contraseña actual"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">
                    Confirmar Nueva Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Confirma tu nueva contraseña"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                  disabled={changePassword.isPending}
                >
                  {changePassword.isPending
                    ? "Cambiando..."
                    : "Cambiar Contraseña"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Información de la Cuenta */}
        <Card className="shadow-apple border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Información de la Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Rol:</span>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.role === "admin"
                    ? "bg-orange-100 text-orange-700"
                    : user.role === "ingeniero_tramites"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {user.role === "admin" 
                  ? "Administrador" 
                  : user.role === "ingeniero_tramites"
                  ? "Ingeniero de Trámites"
                  : "Ingeniero"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>Método de acceso:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {user.loginMethod === "oauth" ? "OAuth (Manus)" : "JWT"}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Miembro desde:</span>
              </div>
              <span className="text-sm font-medium text-gray-900">
                {new Date(user.createdAt).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
