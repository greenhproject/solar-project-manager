/**
 * Hook personalizado para Auth0
 * 
 * Proporciona una interfaz simplificada para la autenticación con Auth0
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

export function useAuth0Custom() {
  // Intentar usar Auth0, pero manejar el caso cuando no está configurado
  let auth0Context;
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
          const token = await getAccessTokenSilently();
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
        } catch (error) {
          console.error('[Auth0] Error getting access token:', error);
        }
      } else {
        setAccessToken(null);
        localStorage.removeItem('auth_token');
      }
    };

    getToken();
  }, [isAuthenticated, getAccessTokenSilently]);

  const login = () => {
    loginWithRedirect();
  };

  const logout = () => {
    // Limpiar token del localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user_email');
    localStorage.removeItem('auth_user_name');
    
    // Cerrar sesión de Auth0 y redirigir a la página de login
    auth0Logout({
      logoutParams: {
        returnTo: `${window.location.origin}/login`,
      },
    });
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    accessToken,
    login,
    logout,
  };
}
