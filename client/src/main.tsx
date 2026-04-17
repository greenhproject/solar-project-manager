// ============================================================
// Monkey-patch removeChild & insertBefore to prevent crashes
// caused by Google Translate (and similar browser extensions)
// that modify the DOM outside of React's control.
// See: https://github.com/facebook/react/issues/11538
// ============================================================
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  // @ts-ignore - monkey patching native method
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn('[DOM Patch] Cannot remove a child from a different parent — likely caused by Google Translate or a browser extension.');
      return child;
    }
    return originalRemoveChild.apply(this, [child]) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  // @ts-ignore - monkey patching native method
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[DOM Patch] Cannot insert before a reference node from a different parent — likely caused by Google Translate or a browser extension.');
      return newNode;
    }
    return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
  };
}

import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { Auth0ProviderWrapper } from "./_core/Auth0Provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar automáticamente en errores de autenticación
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) {
          return false; // No reintentar errores 401
        }
        return failureCount < 2; // Reintentar otros errores hasta 2 veces
      },
      // Mantener datos en caché por 5 minutos para evitar refetches innecesarios
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

// Contador de errores 401 consecutivos para evitar reaccionar al primer error
let consecutive401Errors = 0;
const MAX_401_BEFORE_ACTION = 3; // Necesitamos 3 errores 401 consecutivos antes de actuar

const handleUnauthorizedError = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) {
    // Reset counter on non-401 errors (means some requests are working)
    consecutive401Errors = 0;
    return;
  }

  consecutive401Errors++;
  console.log(`[Auth] 401 error #${consecutive401Errors}/${MAX_401_BEFORE_ACTION}`);

  // Si Auth0 está configurado, NO limpiar el token inmediatamente
  // El MainLayout y useAuth0Custom manejarán la renovación del token
  if (isAuth0Configured()) {
    if (consecutive401Errors >= MAX_401_BEFORE_ACTION) {
      console.log('[Auth] Multiple consecutive 401 errors - clearing stale token from localStorage');
      // Solo limpiar el token del localStorage después de múltiples fallos
      // Esto permite que useAuth0Custom intente renovar el token primero
      localStorage.removeItem('auth_token');
      consecutive401Errors = 0;
    } else {
      console.log('[Auth] 401 error - waiting for token renewal before taking action');
    }
  } else {
    // Fallback para Manus OAuth - redirigir a login
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }
};

// Resetear el contador cuando una query tiene éxito
queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated") {
    if (event.action.type === "error") {
      const error = event.query.state.error;
      handleUnauthorizedError(error);
      // Solo loguear errores que no sean 401 (los 401 ya se manejan arriba)
      if (!(error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)) {
        console.error("[API Query Error]", error);
      }
    } else if (event.action.type === "success") {
      // Una query exitosa = el token funciona, resetear contador
      if (consecutive401Errors > 0) {
        console.log('[Auth] Query succeeded - resetting 401 counter');
        consecutive401Errors = 0;
      }
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated") {
    if (event.action.type === "error") {
      const error = event.mutation.state.error;
      handleUnauthorizedError(error);
      if (!(error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)) {
        console.error("[API Mutation Error]", error);
      }
    } else if (event.action.type === "success") {
      if (consecutive401Errors > 0) {
        consecutive401Errors = 0;
      }
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Obtener el token de localStorage
        const token = localStorage.getItem('auth_token');
        const userEmail = localStorage.getItem('auth_user_email');
        const userName = localStorage.getItem('auth_user_name');
        
        const headers: Record<string, string> = {
          ...(init?.headers as Record<string, string> || {}),
        };
        
        // Agregar el token al header Authorization si existe
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Agregar email y name como headers personalizados
        if (userEmail) {
          headers['X-User-Email'] = userEmail;
        }
        if (userName) {
          headers['X-User-Name'] = userName;
        }
        
        return globalThis.fetch(input, {
          ...(init ?? {}),
          // Enviar cookies para Manus OAuth y Auth0
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <Auth0ProviderWrapper>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </trpc.Provider>
  </Auth0ProviderWrapper>
);
