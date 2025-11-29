/**
 * Proveedor de Auth0 para la aplicación React
 * 
 * Este componente envuelve la aplicación y proporciona el contexto de autenticación
 */

import { Auth0Provider } from '@auth0/auth0-react';
import { ReactNode } from 'react';

interface Auth0ProviderWrapperProps {
  children: ReactNode;
}

export function Auth0ProviderWrapper({ children }: Auth0ProviderWrapperProps) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN || '';
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID || '';
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE || '';

  // Determinar la URL de redirección basada en el entorno
  const redirectUri = window.location.origin;

  if (!domain || !clientId) {
    console.error('[Auth0] Missing configuration. Please set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID');
    return <div>Error: Auth0 configuration missing</div>;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage" // Usar localStorage para persistir la sesión
      useRefreshTokens={true} // Usar refresh tokens para mantener la sesión
    >
      {children}
    </Auth0Provider>
  );
}
