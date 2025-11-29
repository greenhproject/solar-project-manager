import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Sun, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  
  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPasswordMutation.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 p-4">
        <Card className="w-full max-w-md shadow-apple-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-solar rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Email Enviado</CardTitle>
            <CardDescription>
              Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">📧 Revisa tu bandeja de entrada</p>
                <p>El enlace expirará en 1 hora por seguridad.</p>
              </div>
              
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al Login
                </Button>
              </Link>
            </div>
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
          <CardTitle className="text-2xl">Recuperar Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            {forgotPasswordMutation.error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {forgotPasswordMutation.error.message}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-gradient-solar hover:opacity-90"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? "Enviando..." : "Enviar Enlace de Recuperación"}
            </Button>

            <div className="text-center space-y-2">
              <Link href="/login">
                <Button variant="ghost" className="text-sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
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
