/**
 * Hook unificado de autenticación
 * 
 * Detecta automáticamente si usar Auth0 o Manus OAuth
 * y proporciona una interfaz consistente para ambos sistemas
 */
import { useAuth } from "./useAuth";
import { useAuth0Custom } from "./useAuth0Custom";
import { useMemo, useCallback } from "react";

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

// Tipo unificado de usuario
export interface UnifiedUser {
  id: number;
  openId: string;
  name: string;
  email: string;
  role: "admin" | "user" | "engineer" | "ingeniero_tramites";
  avatarUrl: string | null;
  createdAt: Date;
  lastSignedIn: Date;
}

export function useUnifiedAuth() {
  // Obtener ambos sistemas de autenticación
  const manusAuth = useAuth();
  const auth0 = useAuth0Custom();
  
  // Determinar qué sistema usar
  const isUsingAuth0 = isAuth0Configured();
  
  // Construir usuario unificado
  const user: UnifiedUser | null = useMemo(() => {
    if (isUsingAuth0) {
      // Usar Auth0
      if (!auth0.user) return null;
      return {
        id: 0,
        openId: auth0.user.sub || '',
        name: auth0.user.name || auth0.user.nickname || auth0.user.email?.split('@')[0] || 'Usuario',
        email: auth0.user.email || '',
        role: 'admin' as const, // Por defecto admin para Auth0, se puede mejorar con roles de Auth0
        avatarUrl: auth0.user.picture || null,
        createdAt: new Date(),
        lastSignedIn: new Date(),
      };
    } else {
      // Usar Manus Auth
      return manusAuth.user as UnifiedUser | null;
    }
  }, [isUsingAuth0, auth0.user, manusAuth.user]);
  
  // Estado de autenticación unificado
  const isAuthenticated = isUsingAuth0 ? auth0.isAuthenticated : manusAuth.isAuthenticated;
  const isLoading = isUsingAuth0 ? auth0.isLoading : manusAuth.loading;
  
  // Función de logout unificada
  const logout = useCallback(() => {
    if (isUsingAuth0) {
      auth0.logout();
    } else {
      manusAuth.logout();
    }
  }, [isUsingAuth0, auth0, manusAuth]);
  
  // Función de refresh (solo para Manus)
  const refresh = useCallback(() => {
    if (!isUsingAuth0 && manusAuth.refresh) {
      manusAuth.refresh();
    }
  }, [isUsingAuth0, manusAuth]);
  
  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refresh,
    isUsingAuth0,
  };
}
