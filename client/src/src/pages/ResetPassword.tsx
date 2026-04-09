import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Sun, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Extraer token de la URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Token no encontrado en la URL");
    }
  }, []);

  const resetPasswordMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    },
    onError: err => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <Card className="w-full max-w-md shadow-apple-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">¡Contraseña Actualizada!</CardTitle>
            <CardDescription>
              Tu contraseña ha sido restablecida correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 text-center">
                <p>Serás redirigido al login en 3 segundos...</p>
              </div>

              <Link href="/login">
                <Button className="w-full bg-gradient-solar">
                  Ir al Login Ahora
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <Card className="w-full max-w-md shadow-apple-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full bg-gradient-solar">
                Solicitar Nuevo Enlace
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-apple-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-solar rounded-full flex items-center justify-center mb-4">
            <Sun className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Nueva Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu nueva contraseña para restablecer el acceso a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-solar hover:opacity-90"
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? "Actualizando..."
                : "Restablecer Contraseña"}
            </Button>

            <div className="text-center">
              <Link href="/login">
                <Button variant="ghost" className="text-sm">
                  Volver al Login
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
