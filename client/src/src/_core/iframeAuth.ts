/**
 * Utilidades para manejar autenticación en iframe (Wix, etc.)
 * 
 * Auth0 no permite login dentro de iframes por seguridad (X-Frame-Options).
 * Esta utilidad detecta si estamos en un iframe y abre el login en un popup.
 */

/**
 * Detecta si la aplicación está corriendo dentro de un iframe
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // Si hay un error de acceso, definitivamente estamos en un iframe
    return true;
  }
}

/**
 * Abre el login de Auth0 en un popup window
 * @param loginUrl URL de login de Auth0
 * @returns Promise que se resuelve cuando el login es exitoso
 */
export function openLoginPopup(loginUrl: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Dimensiones del popup
    const width = 500;
    const height = 600;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;

    // Abrir popup centrado
    const popup = window.open(
      loginUrl,
      'auth0_login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      reject(new Error('No se pudo abrir el popup. Por favor, permite popups para este sitio.'));
      return;
    }

    // Polling para detectar cuando el popup se cierra o completa el login
    const checkPopup = setInterval(() => {
      try {
        // Verificar si el popup fue cerrado
        if (popup.closed) {
          clearInterval(checkPopup);
          
          // Verificar si el login fue exitoso revisando localStorage
          const token = localStorage.getItem('auth_token');
          if (token) {
            resolve(true);
          } else {
            reject(new Error('Login cancelado'));
          }
          return;
        }

        // Intentar detectar si el popup completó el login
        // (esto solo funciona si el popup está en el mismo dominio)
        try {
          const popupUrl = popup.location.href;
          if (popupUrl.includes('/dashboard') || popupUrl.includes('/projects')) {
            // Login exitoso, cerrar popup
            popup.close();
            clearInterval(checkPopup);
            resolve(true);
          }
        } catch (e) {
          // Error de CORS esperado cuando el popup está en otro dominio (Auth0)
          // Ignorar y continuar el polling
        }
      } catch (error) {
        clearInterval(checkPopup);
        reject(error);
      }
    }, 500); // Verificar cada 500ms

    // Timeout después de 5 minutos
    setTimeout(() => {
      clearInterval(checkPopup);
      if (!popup.closed) {
        popup.close();
      }
      reject(new Error('Timeout: El login tardó demasiado'));
    }, 5 * 60 * 1000);
  });
}

/**
 * Maneja el login considerando si estamos en un iframe o no
 * @param loginUrl URL de login
 * @param onSuccess Callback cuando el login es exitoso
 * @param onError Callback cuando hay un error
 */
export async function handleLogin(
  loginUrl: string,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  if (isInIframe()) {
    // Estamos en iframe, usar popup
    try {
      await openLoginPopup(loginUrl);
      // Login exitoso, recargar la página del iframe
      window.location.reload();
      onSuccess?.();
    } catch (error) {
      console.error('[IframeAuth] Error en login con popup:', error);
      onError?.(error as Error);
    }
  } else {
    // No estamos en iframe, redirigir normalmente
    window.location.href = loginUrl;
  }
}
