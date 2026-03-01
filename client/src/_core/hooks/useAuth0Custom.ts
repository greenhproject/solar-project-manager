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
import { useEffect, useState, useCallback } from 'react';

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

  // Obtener el token de acceso cuando el usuario está autenticado
  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently({
            // Forzar renovación si el token está por expirar
            cacheMode: 'on',
          });
          setAccessToken(token);
          // Guardar el token en localStorage para usarlo en las peticiones
          localStorage.setItem('auth_token', token);
          
          // Guardar email y name del usuario para enviarlos al backend
          console.log('[Auth0] User data:', { email: user?.email, name: user?.name, nickname: user?.nickname });
          
          if (user?.email) {
            localStorage.setItem('auth_user_email', user.email);
          }
          
          // Usar name, nickname o email como fallback
          const userName = user?.name || user?.nickname || user?.email?.split('@')[0] || 'Usuario';
          localStorage.setItem('auth_user_name', userName);
        } catch (error: any) {
          console.error('[Auth0] Error getting access token:', error);
          
          // Si el error es de login_required o consent_required, 
          // el refresh token expiró, necesitamos re-autenticar
          if (error?.error === 'login_required' || error?.error === 'consent_required') {
            console.log('[Auth0] Token expired, clearing and redirecting to login');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user_email');
            localStorage.removeItem('auth_user_name');
            loginWithRedirect({
              appState: { returnTo: '/dashboard' },
            });
          }
        }
      } else {
        setAccessToken(null);
        localStorage.removeItem('auth_token');
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently, user, loginWithRedirect]);

  // Renovar token periódicamente (cada 5 minutos)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const token = await getAccessTokenSilently({
          cacheMode: 'off', // Forzar renovación
        });
        localStorage.setItem('auth_token', token);
        setAccessToken(token);
        console.log('[Auth0] Token renewed successfully');
      } catch (error: any) {
        console.error('[Auth0] Token renewal failed:', error);
        if (error?.error === 'login_required') {
          clearInterval(interval);
          localStorage.removeItem('auth_token');
          loginWithRedirect({
            appState: { returnTo: '/dashboard' },
          });
        }
      }
    }, 5 * 60 * 1000); // Cada 5 minutos

    return () => clearInterval(interval);
  }, [isAuthenticated, getAccessTokenSilently, loginWithRedirect]);

  const login = useCallback(() => {
    loginWithRedirect({
      appState: {
        returnTo: '/dashboard',
      },
    });
  }, [loginWithRedirect]);

  const signup = useCallback(() => {
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
    
    // Cerrar sesión de Auth0 completamente y redirigir a la página principal
    // Esto fuerza al usuario a re-autenticarse explícitamente
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
    login,
    signup,
    logout,
  };
}
