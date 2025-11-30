# Guía de Publicación en Manus

Este documento explica cómo publicar el proyecto Solar Project Manager en Manus para que funcione con el link público.

## Estado Actual

✅ **El código ya está completamente preparado para funcionar en Manus público**

No se requieren cambios adicionales en el código. La configuración actual soporta automáticamente:

- OAuth dinámico que se adapta al dominio actual
- Cookies configuradas para subdominios de Manus
- Variables de entorno inyectadas automáticamente por Manus

## Pasos para Publicar

### 1. Crear Checkpoint

Antes de publicar, asegúrate de tener un checkpoint guardado:

1. Ve a la interfaz de Manus
2. Haz clic en "Save Checkpoint"
3. Espera a que se complete el guardado

### 2. Publicar el Proyecto

1. En la interfaz de Manus, haz clic en el botón **"Publish"** (esquina superior derecha)
2. Manus automáticamente:
   - Generará un dominio público: `https://tu-proyecto.manus.space`
   - Registrará la URL de callback OAuth: `https://tu-proyecto.manus.space/api/oauth/callback`
   - Configurará las variables de entorno necesarias
   - Habilitará HTTPS para cookies seguras

### 3. Verificar Funcionamiento

Después de publicar:

1. Abre el link público proporcionado por Manus
2. Haz clic en "Iniciar Sesión"
3. Completa el flujo de OAuth de Manus
4. Verifica que redirija correctamente al dashboard

## Configuración Automática

Manus configura automáticamente estas variables en producción:

- `VITE_APP_ID`: ID de la aplicación OAuth
- `OAUTH_SERVER_URL`: URL del servidor OAuth de Manus
- `VITE_OAUTH_PORTAL_URL`: URL del portal de login
- `DATABASE_URL`: Conexión a la base de datos
- `JWT_SECRET`: Secreto para firmar tokens

## Variables Adicionales Requeridas

Para funcionalidad completa en producción, asegúrate de configurar:

### OpenSolar API (Sincronización de Proyectos)

```
OPENSOLAR_EMAIL=gerencia@greenhproject.com
OPENSOLAR_PASSWORD=Ghp2025@
OPENSOLAR_ORG_ID=80856
```

### Auth0 (Para Railway - Opcional)

Si también despliegas en Railway, configura:

```
AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
AUTH0_CLIENT_ID=tu-client-id
AUTH0_AUDIENCE=https://solar-project-manager-api
```

## Arquitectura Multi-Entorno

El sistema detecta automáticamente el entorno y usa la autenticación apropiada:

### Desarrollo (Manus Sandbox)
- URL: `https://3000-xxx.manusvm.computer`
- Autenticación: Manus OAuth
- Cookies: `sameSite=lax`

### Producción (Manus Público)
- URL: `https://tu-proyecto.manus.space`
- Autenticación: Manus OAuth
- Cookies: `sameSite=none`, `secure=true`

### Producción (Railway)
- URL: `https://tu-dominio.railway.app`
- Autenticación: Auth0
- Cookies: `sameSite=none`, `secure=true`

## Código Relevante

### OAuth URL Dinámica
```typescript
// client/src/const.ts
export const getLoginUrl = () => {
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  // Se adapta automáticamente al dominio actual
  ...
};
```

### Cookies Cross-Domain
```typescript
// server/_core/cookies.ts
export function getSessionCookieOptions(req: Request) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure,
    domain: undefined, // Permite subdominios
  };
}
```

### Detección de Entorno
```typescript
// server/_core/context.ts
const isManusEnvironment = () => {
  return !!ENV.oAuthServerUrl && ENV.oAuthServerUrl.includes("manus.im");
};

const isAuth0Environment = () => {
  return !!ENV.auth0Domain && !!ENV.auth0Audience;
};
```

## Solución de Problemas

### Login no funciona en producción

1. Verifica que el dominio público esté registrado en la aplicación OAuth de Manus
2. Revisa la consola del navegador para errores de cookies
3. Asegúrate de que HTTPS esté habilitado

### Cookies no se guardan

1. Verifica que `credentials: "include"` esté configurado en el cliente tRPC
2. Revisa que `sameSite: "none"` y `secure: true` estén activos en HTTPS
3. Comprueba que no haya bloqueadores de cookies en el navegador

### OAuth redirect loop

1. Verifica que la URL de callback sea correcta: `https://tu-dominio/api/oauth/callback`
2. Revisa que el `state` parameter se esté codificando correctamente
3. Comprueba los logs del servidor para ver errores de autenticación

## Soporte

Para problemas relacionados con la publicación en Manus:
- Documentación: https://docs.manus.im
- Soporte: https://help.manus.im

Para problemas del código del proyecto:
- Revisa los logs del servidor en la interfaz de Manus
- Usa las herramientas de desarrollo del navegador
- Consulta el archivo `todo.md` para el estado de las funcionalidades
