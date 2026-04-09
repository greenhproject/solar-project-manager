import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Button } from "./ui/button";
import { useNotificationMonitor } from "@/hooks/useNotificationMonitor";
import { useAuth0Custom } from "@/_core/hooks/useAuth0Custom";
import { trpc } from "@/lib/trpc";

interface MainLayoutProps {
  children: ReactNode;
}

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

// Componente interno para Auth0
function MainLayoutAuth0({ children }: MainLayoutProps) {
  const auth0 = useAuth0Custom();
  const [backendReady, setBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(false);
  
  // Verificar que el backend también reconoce al usuario
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    enabled: auth0.isAuthenticated && !!auth0.accessToken,
  });

  // Monitorear y enviar notificaciones automáticas
  useNotificationMonitor();

  useEffect(() => {
    if (meQuery.data) {
      setBackendReady(true);
      setBackendError(false);
    } else if (meQuery.error && !meQuery.isLoading) {
      console.error('[MainLayout] Backend auth error:', meQuery.error);
      setBackendError(true);
    }
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  // Auth0 cargando
  if (auth0.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // No autenticado en Auth0 - mostrar pantalla de login
  if (!auth0.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-apple-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Solar Project Manager
            </h1>
            <p className="text-gray-600 mt-2">Green House Project</p>
          </div>
          <p className="text-gray-500 max-w-md">
            Inicia sesión para acceder al sistema de gestión de proyectos
            solares
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-apple"
            onClick={() => {
              console.log('[MainLayout] Using Auth0 login');
              auth0.login();
            }}
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  // Autenticado en Auth0 pero esperando que el backend confirme
  if (!backendReady && !backendError && meQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Error del backend - token puede estar expirado
  if (backendError && !backendReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-apple-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Sesión Expirada
            </h1>
            <p className="text-gray-600 mt-2">Tu sesión ha expirado o no se pudo verificar</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-apple"
              onClick={() => {
                // Intentar renovar el token silenciosamente primero
                meQuery.refetch();
              }}
            >
              Reintentar
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                // Cerrar sesión completamente y volver a iniciar
                auth0.logout();
              }}
            >
              Cerrar Sesión e Iniciar de Nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 pt-14 sm:p-4 sm:pt-14 lg:p-8 lg:pt-8 pb-20 lg:pb-8">{children}</div>
      </main>
    </div>
  );
}

// Componente interno para Manus OAuth
function MainLayoutManus({ children }: MainLayoutProps) {
  const manusAuth = useAuth();
  
  // Monitorear y enviar notificaciones automáticas
  useNotificationMonitor();

  if (manusAuth.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!manusAuth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-apple-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Solar Project Manager
            </h1>
            <p className="text-gray-600 mt-2">Green House Project</p>
          </div>
          <p className="text-gray-500 max-w-md">
            Inicia sesión para acceder al sistema de gestión de proyectos
            solares
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-apple"
            onClick={() => {
              console.log('[MainLayout] Using Manus OAuth login');
              window.location.href = getLoginUrl();
            }}
          >
            Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 pt-14 sm:p-4 sm:pt-14 lg:p-8 lg:pt-8 pb-20 lg:pb-8">{children}</div>
      </main>
    </div>
  );
}

// Componente principal que decide qué layout usar
export function MainLayout({ children }: MainLayoutProps) {
  // Decidir qué sistema de autenticación usar
  if (isAuth0Configured()) {
    return <MainLayoutAuth0>{children}</MainLayoutAuth0>;
  } else {
    return <MainLayoutManus>{children}</MainLayoutManus>;
  }
}
