import { ReactNode, useEffect, useState, useRef } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, LogIn, RefreshCw, ShieldAlert } from "lucide-react";
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

// Pantalla de sesión expirada reutilizable
function SessionExpiredScreen({ onLogin, onRetry }: { onLogin: () => void; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="text-center space-y-6 p-8 max-w-md">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
          <ShieldAlert className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sesión Expirada</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Tu sesión ha expirado por inactividad. Por favor, inicia sesión nuevamente para continuar.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md"
            onClick={onLogin}
          >
            <LogIn className="w-5 h-5 mr-2" />
            Iniciar Sesión
          </Button>
          {onRetry && (
            <Button
              size="sm"
              variant="ghost"
              className="text-gray-400 hover:text-gray-600"
              onClick={onRetry}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Reintentar conexión
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Las sesiones expiran automáticamente por seguridad después de un período de inactividad.
        </p>
      </div>
    </div>
  );
}

// Pantalla de carga reutilizable
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
}

// Pantalla de login reutilizable
function LoginScreen({ onLogin, title = "Solar Project Manager" }: { onLogin: () => void; title?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="text-center space-y-6 p-8">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-apple-lg">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-gray-600 mt-2">Green House Project</p>
        </div>
        <p className="text-gray-500 max-w-md">
          Inicia sesión para acceder al sistema de gestión de proyectos solares
        </p>
        <Button
          size="lg"
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-apple"
          onClick={onLogin}
        >
          Iniciar Sesión
        </Button>
      </div>
    </div>
  );
}

// Componente interno para Auth0
function MainLayoutAuth0({ children }: MainLayoutProps) {
  const auth0 = useAuth0Custom();
  const [backendTimeout, setBackendTimeout] = useState(false);
  
  // Verificar que el backend también reconoce al usuario
  // Solo habilitar cuando tenemos un token válido
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 2,
    retryDelay: 2000,
    refetchOnWindowFocus: false,
    enabled: auth0.isAuthenticated && !!auth0.accessToken && !auth0.tokenError,
  });

  // Monitorear y enviar notificaciones automáticas
  useNotificationMonitor();

  // Timeout: si después de 12 segundos con token válido el backend no responde
  useEffect(() => {
    if (auth0.isAuthenticated && auth0.accessToken && !meQuery.data && !auth0.tokenError) {
      const timer = setTimeout(() => {
        if (!meQuery.data) {
          console.log('[MainLayout Auth0] Backend verification timeout');
          setBackendTimeout(true);
        }
      }, 12000);
      return () => clearTimeout(timer);
    }
    // Reset timeout when we get data
    if (meQuery.data) {
      setBackendTimeout(false);
    }
  }, [auth0.isAuthenticated, auth0.accessToken, auth0.tokenError, meQuery.data]);

  // Función de logout completo
  const handleFullLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_user_name');
    localStorage.removeItem('manus-runtime-user-info');
    auth0.logout();
  };

  // Función de reintentar
  const handleRetry = () => {
    setBackendTimeout(false);
    window.location.reload();
  };

  // === PASO 1: Auth0 SDK cargando (inicialización) ===
  if (auth0.isLoading) {
    return <LoadingScreen message="Cargando..." />;
  }

  // === PASO 2: No autenticado en Auth0 → pantalla de login ===
  if (!auth0.isAuthenticated) {
    return <LoginScreen onLogin={() => auth0.login()} />;
  }

  // === PASO 3: Autenticado en Auth0 pero error al obtener token ===
  // Esto ocurre cuando: refresh token expiró, sesión Auth0 inválida, etc.
  // "Missing Refresh Token", "login_required", "consent_required"
  if (auth0.tokenError) {
    console.log('[MainLayout Auth0] Token error detected - showing session expired');
    return (
      <SessionExpiredScreen
        onLogin={handleFullLogout}
        onRetry={handleRetry}
      />
    );
  }

  // === PASO 4: Esperando token de Auth0 (getTokenSilently en progreso) ===
  if (!auth0.accessToken) {
    return <LoadingScreen message="Obteniendo credenciales..." />;
  }

  // === PASO 5: Token obtenido, verificando con backend ===
  // Backend error después de reintentos
  if (meQuery.error && meQuery.failureCount >= 2) {
    console.error('[MainLayout Auth0] Backend auth failed:', meQuery.error);
    return (
      <SessionExpiredScreen
        onLogin={handleFullLogout}
        onRetry={handleRetry}
      />
    );
  }

  // Backend timeout
  if (backendTimeout && !meQuery.data) {
    return (
      <SessionExpiredScreen
        onLogin={handleFullLogout}
        onRetry={handleRetry}
      />
    );
  }

  // Esperando respuesta del backend
  if (!meQuery.data) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // === PASO 6: Todo listo - mostrar la app ===
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Monitorear y enviar notificaciones automáticas
  useNotificationMonitor();

  // Timeout de 8 segundos para detectar sesiones colgadas
  useEffect(() => {
    if (manusAuth.loading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [manusAuth.loading]);

  // Loading con timeout: mostrar pantalla de sesión expirada
  if (manusAuth.loading && loadingTimeout) {
    return (
      <SessionExpiredScreen
        onLogin={() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user_email');
          localStorage.removeItem('auth_user_name');
          localStorage.removeItem('manus-runtime-user-info');
          window.location.href = '/';
        }}
        onRetry={() => {
          setLoadingTimeout(false);
          manusAuth.refresh();
        }}
      />
    );
  }

  // Loading normal (menos de 8 segundos)
  if (manusAuth.loading) {
    return <LoadingScreen message="Cargando..." />;
  }

  // No autenticado
  if (!manusAuth.isAuthenticated) {
    return (
      <LoginScreen onLogin={() => {
        window.location.href = getLoginUrl();
      }} />
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
