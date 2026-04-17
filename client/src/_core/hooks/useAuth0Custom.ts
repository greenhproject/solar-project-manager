/**
 * Hook personalizado para Auth0
 * 
 * Proporciona una interfaz simplificada para la autenticación con Auth0.
 * - Login: Redirige a Auth0 para autenticación
 * - Signup: Redirige a Auth0 con screen_hint: 'signup'
 * - Logout: Cierra sesión en Auth0 completamente y redirige a la home page
 * - Token: Se renueva automáticamente con refresh tokens
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState, useCallback, useRef } from 'react';

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
  const tokenAttemptRef = useRef(0);

  // Obtener el token de acceso cuando el usuario está autenticado
  useEffect(() => {
    const getToken = async () => {
      if (!isAuthenticated) {
        setAccessToken(null);
        setTokenError(false);
        localStorage.removeItem('auth_token');
        return;
      }

      // Intentar obtener token
      try {
        tokenAttemptRef.current += 1;
        const currentAttempt = tokenAttemptRef.current;
        
        console.log('[Auth0] Attempting to get access token, attempt:', currentAttempt);
        
        const token = await getAccessTokenSilently({
          cacheMode: 'on',
        });
        
        // Solo actualizar si este es el intento más reciente
        if (currentAttempt === tokenAttemptRef.current) {
          setAccessToken(token);
          setTokenError(false);
          localStorage.setItem('auth_token', token);
          
          console.log('[Auth0] Token obtained successfully');
          console.log('[Auth0] User data:', { email: user?.email, name: user?.name, nickname: user?.nickname });
          
          if (user?.email) {
            localStorage.setItem('auth_user_email', user.email);
          }
          
          const userName = user?.name || user?.nickname || user?.email?.split('@')[0] || 'Usuario';
          localStorage.setItem('auth_user_name', userName);
        }
      } catch (error: any) {
        console.error('[Auth0] Error getting access token:', error?.message || error?.error || error);
        
        // Limpiar token
        localStorage.removeItem('auth_token');
        setAccessToken(null);
        
        // Marcar error de token para que MainLayout pueda reaccionar
        setTokenError(true);
        
        // Para errores que requieren re-autenticación explícita,
        // NO redirigir automáticamente - dejar que MainLayout muestre la pantalla de sesión expirada
        // Esto evita el bucle de redirección
        console.log('[Auth0] Token error - will show session expired screen');
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently, user]);

  // Renovar token periódicamente (cada 5 minutos) - solo si hay token válido
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const interval = setInterval(async () => {
      try {
        const token = await getAccessTokenSilently({
          cacheMode: 'off', // Forzar renovación
        });
        localStorage.setItem('auth_token', token);
        setAccessToken(token);
        setTokenError(false);
        console.log('[Auth0] Token renewed successfully');
      } catch (error: any) {
        console.error('[Auth0] Token renewal failed:', error?.message || error?.error || error);
        clearInterval(interval);
        localStorage.removeItem('auth_token');
        setAccessToken(null);
        setTokenError(true);
      }
    }, 5 * 60 * 1000); // Cada 5 minutos

    return () => clearInterval(interval);
  }, [isAuthenticated, accessToken, getAccessTokenSilently]);

  const login = useCallback(() => {
    // Limpiar estados antes de redirigir a login
    setTokenError(false);
    setAccessToken(null);
    tokenAttemptRef.current = 0;
    loginWithRedirect({
      appState: {
        returnTo: '/dashboard',
      },
    });
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
    setTokenError(false);
    setAccessToken(null);
    tokenAttemptRef.current = 0;
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
    tokenAttemptRef.current = 0;
    
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
    login,
    signup,
    logout,
  };
}
