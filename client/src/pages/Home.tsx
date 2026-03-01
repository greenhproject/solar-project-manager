import { useAuth } from "@/_core/hooks/useAuth";
import { useAuth0Custom } from "@/_core/hooks/useAuth0Custom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { handleLogin } from "@/_core/iframeAuth";
import {
  Sun,
  TrendingUp,
  Bell,
  FileText,
  Zap,
  Shield,
  BarChart3,
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

// Detectar si estamos en entorno Manus verificando el dominio actual
const isManusEnvironment = () => {
  const hostname = window.location.hostname;
  return (
    hostname.includes("manus.space") || hostname.includes("manusvm.computer")
  );
};

export default function Home() {
  const manusAuth = useAuth();
  const auth0 = useAuth0Custom();
  const [, setLocation] = useLocation();
  
  const useAuth0 = isAuth0Configured();
  const useManusAuth = isManusEnvironment() && !useAuth0;
  
  const isAuthenticated = useAuth0 ? auth0.isAuthenticated : manusAuth.isAuthenticated;
  const loading = useAuth0 ? auth0.isLoading : manusAuth.loading;

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <Sun className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

  const handleLoginClick = () => {
    if (useAuth0) {
      auth0.login();
    } else if (useManusAuth) {
      handleLogin(getLoginUrl());
    } else {
      setLocation("/login");
    }
  };

  const handleSignupClick = () => {
    if (useAuth0) {
      // Auth0 maneja el registro directamente con screen_hint: 'signup'
      auth0.signup();
    } else if (useManusAuth) {
      handleLogin(getLoginUrl());
    } else {
      setLocation("/register");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-solar flex items-center justify-center">
              <Sun className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl">Solar PM-GHP</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleLoginClick}>
              Iniciar Sesión
            </Button>
            {/* Solo mostrar botón de Registrarse si NO estamos en Manus (donde no tiene sentido) */}
            {!useManusAuth && (
              <Button onClick={handleSignupClick}>
                Registrarse
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <Zap className="h-4 w-4" />
            Gestión de Proyectos Solares
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Coordina tus{" "}
            <span
              className="bg-gradient-solar bg-clip-text text-transparent"
              style={{ color: "#e95d00" }}
            >
              Proyectos Solares
            </span>{" "}
            con Eficiencia
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para la gestión y seguimiento de proyectos de
            energía solar. Controla hitos, genera reportes y mantén a tu equipo
            sincronizado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="gap-2 text-lg px-8"
              onClick={handleLoginClick}
            >
              <Sun className="h-5 w-5" />
              Comenzar Ahora
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Todo lo que necesitas para gestionar proyectos solares
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Herramientas profesionales diseñadas específicamente para la
            industria solar
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="shadow-apple hover:shadow-apple-lg transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Seguimiento en Tiempo Real</CardTitle>
              <CardDescription>
                Monitorea el progreso de cada proyecto con actualizaciones en
                tiempo real y métricas detalladas
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-apple hover:shadow-apple-lg transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Recordatorios Inteligentes</CardTitle>
              <CardDescription>
                Recibe notificaciones automáticas sobre hitos próximos y
                proyectos que requieren atención
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-apple hover:shadow-apple-lg transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Reportes Ejecutivos</CardTitle>
              <CardDescription>
                Genera reportes PDF profesionales con métricas clave y análisis
                de progreso
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-apple hover:shadow-apple-lg transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sun className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Integración OpenSolar</CardTitle>
              <CardDescription>
                Sincroniza automáticamente con OpenSolar para mantener toda tu
                información actualizada
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-apple hover:shadow-apple-lg transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Control de Acceso</CardTitle>
              <CardDescription>
                Sistema de roles para administradores e ingenieros con permisos
                personalizados
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-apple hover:shadow-apple-lg transition-all">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Análisis y Métricas</CardTitle>
              <CardDescription>
                Visualiza el rendimiento de tus proyectos con dashboards
                intuitivos y gráficos detallados
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container text-center text-muted-foreground">
          <p>
            &copy; 2025 Solar Project Manager - Green House Project. Todos los
            derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
