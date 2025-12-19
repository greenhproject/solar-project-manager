/**
 * Hook unificado de autenticación
 * 
 * Detecta automáticamente si usar Auth0 o Manus OAuth
 * y proporciona una interfaz consistente para ambos sistemas.
 * 
 * IMPORTANTE: El rol del usuario siempre se obtiene del backend (trpc.auth.me)
 * para asegurar que refleje el rol real en la base de datos.
 */
import { useAuth } from "./useAuth";
import { useAuth0Custom } from "./useAuth0Custom";
import { useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";

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
  
  // Obtener el usuario real del backend (incluye el rol correcto de la BD)
  const { data: backendUser, isLoading: backendLoading } = trpc.auth.me.useQuery(undefined, {
    // Solo ejecutar si hay alguna forma de autenticación activa
    enabled: isUsingAuth0 ? auth0.isAuthenticated : manusAuth.isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  
  // Construir usuario unificado - SIEMPRE usar el rol del backend
  const user: UnifiedUser | null = useMemo(() => {
    // Si tenemos datos del backend, usarlos (tienen el rol correcto)
    if (backendUser) {
      return {
        id: backendUser.id,
        openId: backendUser.openId,
        name: backendUser.name || backendUser.email?.split('@')[0] || 'Usuario',
        email: backendUser.email || '',
        role: backendUser.role as "admin" | "user" | "engineer" | "ingeniero_tramites",
        avatarUrl: backendUser.avatarUrl || null,
        createdAt: new Date(backendUser.createdAt),
        lastSignedIn: new Date(backendUser.lastSignedIn),
      };
    }
    
    // Fallback mientras carga el backend
    if (isUsingAuth0) {
      if (!auth0.user || !auth0.isAuthenticated) return null;
      // Mostrar datos básicos de Auth0 mientras carga el backend
      // El rol se actualizará cuando llegue la respuesta del backend
      return {
        id: 0,
        openId: auth0.user.sub || '',
        name: auth0.user.name || auth0.user.nickname || auth0.user.email?.split('@')[0] || 'Usuario',
        email: auth0.user.email || '',
        role: 'user' as const, // Por defecto user hasta que el backend confirme
        avatarUrl: auth0.user.picture || null,
        createdAt: new Date(),
        lastSignedIn: new Date(),
      };
    } else {
      // Usar Manus Auth
      return manusAuth.user as UnifiedUser | null;
    }
  }, [isUsingAuth0, auth0.user, auth0.isAuthenticated, manusAuth.user, backendUser]);
  
  // Estado de autenticación unificado
  const isAuthenticated = isUsingAuth0 ? auth0.isAuthenticated : manusAuth.isAuthenticated;
  const isLoading = isUsingAuth0 
    ? (auth0.isLoading || (auth0.isAuthenticated && backendLoading))
    : manusAuth.loading;
  
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
