import { ReactNode, useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2, LogIn, RefreshCw, ShieldAlert } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Button } from "./ui/button";
import { useNotificationMonitor } from "@/hooks/useNotificationMonitor";
import { useAuth0Custom } from "@/_core/hooks/useAuth0Custom";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

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
              Reintentar
            </Button>
          )}
        </div>
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

// Componente interno para Auth0 (con soporte para sesiones SSO)
function MainLayoutAuth0({ children }: MainLayoutProps) {
  const auth0 = useAuth0Custom();
  const [backendTimeout, setBackendTimeout] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const backendRetryCountRef = useRef(0);
  const utils = trpc.useUtils();
  
  // Verificar sesión del backend (JWT cookie o Auth0 token)
  // IMPORTANTE: Habilitar SIEMPRE para detectar sesiones SSO (cookie JWT)
  // incluso cuando Auth0 no está autenticado
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
    // Habilitar siempre - el backend verifica JWT cookie primero (SSO)
    // y luego Auth0 Bearer token si existe
    enabled: true,
  });

  // Monitorear y enviar notificaciones automáticas
  useNotificationMonitor();

  // Cuando el backend devuelve error y Auth0 está autenticado, intentar renovar el token
  useEffect(() => {
    if (!meQuery.error || !auth0.isAuthenticated || !auth0.accessToken || auth0.tokenError) {
      return;
    }

    const handleBackendError = async () => {
      backendRetryCountRef.current += 1;
      console.log(`[MainLayout Auth0] Backend error (attempt ${backendRetryCountRef.current}):`, meQuery.error?.message);

      // Primer intento: intentar renovar el token
      if (backendRetryCountRef.current <= 2) {
        console.log('[MainLayout Auth0] Attempting token refresh...');
        setIsRefreshingToken(true);
        
        const refreshed = await auth0.refreshToken();
        
        setIsRefreshingToken(false);
        
        if (refreshed) {
          console.log('[MainLayout Auth0] Token refreshed - invalidating meQuery');
          backendRetryCountRef.current = 0;
          utils.auth.me.invalidate();
        } else {
          console.warn('[MainLayout Auth0] Token refresh failed');
        }
      }
    };

    handleBackendError();
  }, [meQuery.error, auth0.isAuthenticated, auth0.accessToken, auth0.tokenError, auth0.refreshToken, utils]);

  // Sync user theme from DB to ThemeContext
  const { setTheme } = useTheme();
  useEffect(() => {
    if (meQuery.data?.theme) {
      setTheme(meQuery.data.theme as "light" | "dark" | "system");
    }
  }, [meQuery.data?.theme, setTheme]);

  // Reset retry counter cuando la query tiene éxito
  useEffect(() => {
    if (meQuery.data) {
      backendRetryCountRef.current = 0;
      setBackendTimeout(false);
    }
  }, [meQuery.data]);

  // Timeout: si después de 15 segundos no hay respuesta del backend
  useEffect(() => {
    if (!meQuery.data && !meQuery.error && meQuery.isLoading) {
      const timer = setTimeout(() => {
        if (!meQuery.data && backendRetryCountRef.current >= 2) {
          console.log('[MainLayout] Backend verification timeout after retries');
          setBackendTimeout(true);
        }
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  // Función de logout - respeta el origen de la sesión
  const handleFullLogout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_user_name');
    localStorage.removeItem('manus-runtime-user-info');
    localStorage.removeItem('sso_login_origin');
    
    // Si el usuario vino por SSO (loginMethod === 'sso'), no hacer logout de Auth0
    // Solo limpiar la sesión local y redirigir a la home
    if (meQuery.data?.loginMethod === 'sso') {
      // Logout solo local - no tocar Auth0
      window.location.href = '/';
    } else {
      auth0.logout();
    }
  }, [auth0, meQuery.data]);

  // Función de reintentar
  const handleRetry = useCallback(async () => {
    setBackendTimeout(false);
    backendRetryCountRef.current = 0;
    
    if (auth0.isAuthenticated) {
      // Intentar renovar el token primero
      setIsRefreshingToken(true);
      const refreshed = await auth0.refreshToken();
      setIsRefreshingToken(false);
      
      if (refreshed) {
        utils.auth.me.invalidate();
      } else {
        window.location.reload();
      }
    } else {
      // No hay sesión Auth0, simplemente recargar para re-verificar cookie JWT
      window.location.reload();
    }
  }, [auth0, utils]);

  // Función de login - redirige a Auth0
  const handleLogin = useCallback(() => {
    auth0.login();
  }, [auth0]);

  // === PASO 1: Cargando datos del backend ===
  if (meQuery.isLoading && !meQuery.data) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  // === PASO 2: Usuario autenticado (ya sea por JWT/SSO o por Auth0) ===
  if (meQuery.data) {
    // Redirigir clientes al portal
    if (meQuery.data.role === "client") {
      window.location.href = "/portal";
      return <LoadingScreen message="Redirigiendo al portal..." />;
    }

    // Todo listo - mostrar la app
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-3 pt-14 sm:p-4 sm:pt-14 lg:p-8 lg:pt-8 pb-20 lg:pb-8">{children}</div>
        </main>
      </div>
    );
  }

  // === PASO 3: Auth0 SDK cargando ===
  if (auth0.isLoading) {
    return <LoadingScreen message="Cargando..." />;
  }

  // === PASO 4: Auth0 autenticado pero backend no reconoce (token error) ===
  if (auth0.isAuthenticated && auth0.tokenError) {
    return (
      <SessionExpiredScreen
        onLogin={handleFullLogout}
        onRetry={handleRetry}
      />
    );
  }

  // === PASO 5: Auth0 autenticado, esperando token ===
  if (auth0.isAuthenticated && !auth0.accessToken) {
    return <LoadingScreen message="Obteniendo credenciales..." />;
  }

  // === PASO 6: Refrescando token ===
  if (isRefreshingToken) {
    return <LoadingScreen message="Renovando sesión..." />;
  }

  // === PASO 7: Backend timeout ===
  if (backendTimeout) {
    return (
      <SessionExpiredScreen
        onLogin={handleFullLogout}
        onRetry={handleRetry}
      />
    );
  }

  // === PASO 8: Backend error con Auth0 autenticado ===
  if (meQuery.error && auth0.isAuthenticated && backendRetryCountRef.current >= 2) {
    return (
      <SessionExpiredScreen
        onLogin={handleFullLogout}
        onRetry={handleRetry}
      />
    );
  }

  // === PASO 9: No autenticado en ningún sistema → mostrar login ===
  return <LoginScreen onLogin={handleLogin} />;
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

  // Redirigir clientes al portal
  if (manusAuth.user?.role === "client") {
    window.location.href = "/portal";
    return <LoadingScreen message="Redirigiendo al portal..." />;
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
