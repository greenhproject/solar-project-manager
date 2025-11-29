/**
 * Hook personalizado para Auth0
 * 
 * Proporciona una interfaz simplificada para la autenticación con Auth0
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useState } from 'react';

export function useAuth0Custom() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

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
    localStorage.removeItem('auth_token');
    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
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
