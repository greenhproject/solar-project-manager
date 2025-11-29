import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Sun, TrendingUp, Bell, FileText, Zap, Shield, BarChart3 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";

// Detectar si estamos en entorno Manus (tiene OAuth configurado)
const isManusEnvironment = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  return oauthPortalUrl && oauthPortalUrl.includes("manus.im");
};

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const useManusAuth = isManusEnvironment();

  // Redirigir al dashboard si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && user) {
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <Sun className="h-12 w-12 text-primary" />
        </div>
      </div>
    );
  }

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
            {useManusAuth ? (
              <a href={getLoginUrl()}>
                <Button>Iniciar Sesión</Button>
              </a>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setLocation("/login")}>
                  Iniciar Sesión
                </Button>
                <Button onClick={() => setLocation("/register")}>
                  Registrarse
                </Button>
              </>
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
            <span className="bg-gradient-solar bg-clip-text text-transparent" style={{color: '#e95d00'}}>
              Proyectos Solares
            </span>
            {" "}con Eficiencia
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma completa para la gestión y seguimiento de proyectos de energía solar. 
            Controla hitos, genera reportes y mantén a tu equipo sincronizado.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {useManusAuth ? (
              <a href={getLoginUrl()}>
                <Button size="lg" className="gap-2 text-lg px-8">
                  <Sun className="h-5 w-5" />
                  Comenzar Ahora
                </Button>
              </a>
            ) : (
              <Button size="lg" className="gap-2 text-lg px-8" onClick={() => setLocation("/register")}>
                <Sun className="h-5 w-5" />
                Comenzar Ahora
              </Button>
            )}
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
            Herramientas profesionales diseñadas específicamente para la industria solar
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
                Monitorea el progreso de cada proyecto con actualizaciones en tiempo real y métricas detalladas
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
                Recibe notificaciones automáticas sobre hitos próximos y proyectos que requieren atención
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
                Genera reportes PDF profesionales con métricas clave y análisis de progreso
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
                Sincroniza automáticamente con OpenSolar para mantener toda tu información actualizada
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
                Sistema de roles para administradores e ingenieros con permisos personalizados
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
                Visualiza el rendimiento de tus proyectos con dashboards intuitivos y gráficos detallados
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container text-center text-muted-foreground">
          <p>&copy; 2025 Solar Project Manager - Green House Project. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
