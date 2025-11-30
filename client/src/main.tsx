import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { Auth0ProviderWrapper } from "./_core/Auth0Provider";

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
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
