/**
 * Proveedor de Auth0 para la aplicación React
 * 
 * Este componente envuelve la aplicación y proporciona el contexto de autenticación.
 * Después del login exitoso, redirige automáticamente al dashboard.
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

  // Si no hay configuración de Auth0, renderizar children sin el provider
  // Esto permite que la app funcione en Manus con Manus OAuth
  if (!domain || !clientId) {
    console.log('[Auth0] No configuration found. Using Manus OAuth or JWT authentication.');
    return <>{children}</>;
  }

  // Callback URL para Auth0 - debe ser la raíz para que Auth0 pueda procesar el callback
  // Luego el onRedirectCallback se encarga de redirigir al dashboard
  const redirectUri = window.location.origin;

  const onRedirectCallback = (appState: any) => {
    // Después del login exitoso, redirigir al returnTo guardado o al dashboard
    const returnTo = appState?.returnTo || '/dashboard';
    console.log('[Auth0] Redirect callback, navigating to:', returnTo);
    window.location.href = returnTo;
  };

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        audience: audience,
        scope: 'openid profile email',
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  );
}
