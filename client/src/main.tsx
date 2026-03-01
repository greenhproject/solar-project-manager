import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { Auth0ProviderWrapper } from "./_core/Auth0Provider";

const queryClient = new QueryClient();

// Detectar si Auth0 está configurado
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};

// Flag para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (isRedirecting) return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Si Auth0 está configurado, NO redirigir a Manus OAuth
  // El MainLayout se encargará de mostrar la pantalla de sesión expirada
  if (isAuth0Configured()) {
    console.log('[Auth] Session expired with Auth0 - MainLayout will handle re-auth');
    // No redirigir automáticamente, dejar que MainLayout maneje el error
    // Solo limpiar el token corrupto
    localStorage.removeItem('auth_token');
  } else {
    // Fallback para Manus OAuth - redirigir a login
    isRedirecting = true;
    window.location.href = '/login';
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
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
