/**
 * Hook personalizado para Auth0
 * 
 * Proporciona una interfaz simplificada para la autenticación con Auth0.
 * - Login: Redirige a Auth0 para autenticación
 * - Signup: Redirige a Auth0 con screen_hint: 'signup'
 * - Logout: Cierra sesión en Auth0 completamente y redirige a la home page
 * - Token: Se renueva automáticamente con refresh tokens
 * 
 * Estrategia de renovación de tokens:
 * 1. Al autenticarse, obtiene el token inmediatamente
 * 2. Renueva proactivamente cada 50 minutos (antes de que expire)
 * 3. Si falla la renovación, reintenta 3 veces con backoff exponencial
 * 4. Solo marca tokenError=true después de agotar todos los reintentos
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback, useRef } from 'react';

// Intervalo de renovación: 50 minutos (antes de que expire el token de 1h)
const TOKEN_RENEWAL_INTERVAL_MS = 50 * 60 * 1000;
// Máximo de reintentos al fallar la obtención/renovación del token
const MAX_TOKEN_RETRIES = 3;
// Delay base para backoff exponencial (2s, 4s, 8s)
const RETRY_BASE_DELAY_MS = 2000;

export function useAuth0Custom() {
  // Intentar usar Auth0, pero manejar el caso cuando no está configurado
  let auth0Context: any;
  try {
    auth0Context = useAuth0();
  } catch (error) {
    // Auth0 no está configurado, usar valores por defecto
    auth0Context = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      loginWithRedirect: () => {},
      logout: () => {},
      getAccessTokenSilently: async () => '',
    };
  }
  
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = auth0Context;

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<boolean>(false);
  const retryCountRef = useRef(0);
  const renewalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (renewalTimerRef.current) {
        clearInterval(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
    };
  }, []);

  /**
   * Intenta obtener un token de acceso con reintentos y backoff exponencial
   */
  const fetchTokenWithRetry = useCallback(async (isRenewal: boolean = false): Promise<string | null> => {
    for (let attempt = 0; attempt < MAX_TOKEN_RETRIES; attempt++) {
      try {
        const token = await getAccessTokenSilently({
          cacheMode: isRenewal ? 'off' : 'on', // Forzar renovación solo en renewal
        });
        
        if (!isMountedRef.current) return null;
        
        console.log(`[Auth0] Token ${isRenewal ? 'renewed' : 'obtained'} successfully (attempt ${attempt + 1})`);
        return token;
      } catch (error: any) {
        const errorMsg = error?.message || error?.error || String(error);
        console.warn(`[Auth0] Token ${isRenewal ? 'renewal' : 'fetch'} failed (attempt ${attempt + 1}/${MAX_TOKEN_RETRIES}):`, errorMsg);
        
        // Si es un error que definitivamente requiere re-login, no reintentar
        // "login_required" = sesión de Auth0 expiró completamente
        // "consent_required" = necesita consentimiento del usuario
        if (errorMsg.includes('login_required') || errorMsg.includes('consent_required')) {
          console.log('[Auth0] Unrecoverable auth error - requires re-login');
          return null;
        }
        
        // Para otros errores (Missing Refresh Token, network, etc.), reintentar con backoff
        if (attempt < MAX_TOKEN_RETRIES - 1) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          console.log(`[Auth0] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          if (!isMountedRef.current) return null;
        }
      }
    }
    
    return null; // Todos los reintentos fallaron
  }, [getAccessTokenSilently]);

  // Obtener el token de acceso cuando el usuario está autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      setAccessToken(null);
      setTokenError(false);
      retryCountRef.current = 0;
      localStorage.removeItem('auth_token');
      // Limpiar timer de renovación
      if (renewalTimerRef.current) {
        clearInterval(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
      return;
    }

    const getToken = async () => {
      console.log('[Auth0] Attempting to get initial access token');
      
      const token = await fetchTokenWithRetry(false);
      
      if (!isMountedRef.current) return;
      
      if (token) {
        setAccessToken(token);
        setTokenError(false);
        retryCountRef.current = 0;
        localStorage.setItem('auth_token', token);
        
        console.log('[Auth0] Token stored successfully');
        console.log('[Auth0] User data:', { email: user?.email, name: user?.name, nickname: user?.nickname });
        
        if (user?.email) {
          localStorage.setItem('auth_user_email', user.email);
        }
        
        const userName = user?.name || user?.nickname || user?.email?.split('@')[0] || 'Usuario';
        localStorage.setItem('auth_user_name', userName);
      } else {
        // Todos los reintentos fallaron
        console.error('[Auth0] All token fetch attempts failed - marking token error');
        localStorage.removeItem('auth_token');
        setAccessToken(null);
        setTokenError(true);
      }
    };

    getToken();
  }, [isAuthenticated, fetchTokenWithRetry, user]);

  // Renovar token proactivamente cada 50 minutos
  useEffect(() => {
    if (!isAuthenticated || !accessToken || tokenError) {
      // Limpiar timer si no estamos en estado válido
      if (renewalTimerRef.current) {
        clearInterval(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
      return;
    }

    // Limpiar timer anterior si existe
    if (renewalTimerRef.current) {
      clearInterval(renewalTimerRef.current);
    }

    console.log(`[Auth0] Setting up token renewal every ${TOKEN_RENEWAL_INTERVAL_MS / 60000} minutes`);

    renewalTimerRef.current = setInterval(async () => {
      console.log('[Auth0] Proactive token renewal starting...');
      
      const newToken = await fetchTokenWithRetry(true);
      
      if (!isMountedRef.current) return;
      
      if (newToken) {
        setAccessToken(newToken);
        setTokenError(false);
        retryCountRef.current = 0;
        localStorage.setItem('auth_token', newToken);
        console.log('[Auth0] Token renewed and stored');
      } else {
        // La renovación falló después de todos los reintentos
        // Pero NO marcamos error inmediatamente - el token actual puede seguir siendo válido
        // Solo incrementamos el contador de fallos
        retryCountRef.current += 1;
        console.warn(`[Auth0] Token renewal failed (consecutive failures: ${retryCountRef.current})`);
        
        // Solo marcar error si fallan 2 renovaciones consecutivas
        // (esto da ~100 minutos antes de declarar sesión expirada)
        if (retryCountRef.current >= 2) {
          console.error('[Auth0] Multiple consecutive renewal failures - marking session expired');
          localStorage.removeItem('auth_token');
          setAccessToken(null);
          setTokenError(true);
        }
      }
    }, TOKEN_RENEWAL_INTERVAL_MS);

    return () => {
      if (renewalTimerRef.current) {
        clearInterval(renewalTimerRef.current);
        renewalTimerRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, tokenError, fetchTokenWithRetry]);

  /**
   * Función pública para forzar renovación del token
   * Útil cuando el backend devuelve 401 y queremos intentar renovar antes de cerrar sesión
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    console.log('[Auth0] Manual token refresh requested');
    
    const newToken = await fetchTokenWithRetry(true);
    
    if (!isMountedRef.current) return false;
    
    if (newToken) {
      setAccessToken(newToken);
      setTokenError(false);
      retryCountRef.current = 0;
      localStorage.setItem('auth_token', newToken);
      console.log('[Auth0] Manual token refresh successful');
      return true;
    }
    
    console.error('[Auth0] Manual token refresh failed');
    return false;
  }, [fetchTokenWithRetry]);

  const login = useCallback(() => {
    // Limpiar estados antes de redirigir a login
    setTokenError(false);
    setAccessToken(null);
    retryCountRef.current = 0;
    loginWithRedirect({
      appState: {
        returnTo: '/dashboard',
      },
    });
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
    setTokenError(false);
    setAccessToken(null);
    retryCountRef.current = 0;
    loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
      appState: {
        returnTo: '/dashboard',
      },
    });
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    // Limpiar tokens del localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_user_name');
    localStorage.removeItem('manus-runtime-user-info');
    setAccessToken(null);
    setTokenError(false);
    retryCountRef.current = 0;
    
    // Limpiar timer de renovación
    if (renewalTimerRef.current) {
      clearInterval(renewalTimerRef.current);
      renewalTimerRef.current = null;
    }
    
    // Cerrar sesión de Auth0 completamente y redirigir a la página principal
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  return {
    isAuthenticated,
    isLoading,
    user,
    accessToken,
    tokenError,
    refreshToken,
    login,
    signup,
    logout,
  };
}
