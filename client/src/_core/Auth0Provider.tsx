/**
 * Proveedor de Auth0 para la aplicación React
 * 
 * Este componente envuelve la aplicación y proporciona el contexto de autenticación
 * 
 * Dominio correcto: dev-s1tr6aqjujd8goqu.us.auth0.com
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

  // Si no hay configuración de Auth0, renderizar children sin el provider
  // Esto permite que la app funcione en Manus con Manus OAuth
  if (!domain || !clientId) {
    console.log('[Auth0] No configuration found. Using Manus OAuth or JWT authentication.');
    return <>{children}</>;
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
