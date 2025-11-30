/**
 * Página de Login con Auth0
 * 
 * Esta página reemplaza el login manual y usa Auth0 para la autenticación
 */

import { useAuth0Custom } from "../_core/hooks/useAuth0Custom";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LoginAuth0() {
  const { isAuthenticated, isLoading, login } = useAuth0Custom();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Si el usuario ya está autenticado, redirigir al dashboard
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Solar Manager</h1>
          <p className="text-gray-600">Gestión de Proyectos Solares</p>
        </div>

        <button
          onClick={login}
          className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-200 shadow-md"
        >
          Iniciar Sesión con Auth0
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Autenticación segura proporcionada por Auth0
        </p>
      </div>
    </div>
  );
}
