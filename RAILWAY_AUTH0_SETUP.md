# Configuración de Auth0 en Railway

Este documento explica cómo configurar correctamente las variables de entorno de Auth0 en Railway para que la autenticación funcione correctamente.

## Problema Identificado

El sistema estaba intentando usar Manus OAuth en Railway en lugar de Auth0 porque:
1. Las variables `VITE_*` no estaban configuradas en Railway
2. El frontend no podía detectar que Auth0 estaba disponible
3. El código intentaba usar ambos sistemas de autenticación simultáneamente

## Solución Implementada

Se refactorizó el código para:
- Separar completamente la lógica de Auth0 y Manus OAuth
- Detectar el sistema correcto basándose en variables de entorno
- Usar SOLO un sistema de autenticación a la vez

## Variables de Entorno Requeridas en Railway

### Backend (server)
```
AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
AUTH0_CLIENT_ID=70HeyKdFmooHu797hruq0L3Q0wva37f5
AUTH0_AUDIENCE=https://solar-project-manager-api
```

### Frontend (client - con prefijo VITE_)
```
VITE_AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
VITE_AUTH0_CLIENT_ID=70HeyKdFmooHu797hruq0L3Q0wva37f5
VITE_AUTH0_AUDIENCE=https://solar-project-manager-api
```

## Pasos para Configurar en Railway

1. **Ir al proyecto en Railway**
   - Abrir https://railway.app
   - Seleccionar el proyecto `solar-project-manager-production`

2. **Agregar variables de entorno**
   - Click en el servicio
   - Ir a la pestaña "Variables"
   - Agregar las 6 variables listadas arriba

3. **Verificar configuración de Auth0**
   - Ir a https://manage.auth0.com
   - Seleccionar la aplicación
   - En "Settings" > "Application URIs":
     - **Allowed Callback URLs**: `https://solar-project-manager-production.up.railway.app`
     - **Allowed Logout URLs**: `https://solar-project-manager-production.up.railway.app/login`
     - **Allowed Web Origins**: `https://solar-project-manager-production.up.railway.app`

4. **Redesplegar**
   - Railway debería redesplegar automáticamente al agregar variables
   - Si no, hacer un push a GitHub o redesplegar manualmente

## Cómo Funciona Ahora

### Detección de Entorno

El sistema detecta automáticamente qué método de autenticación usar:

```typescript
// En MainLayout.tsx
const isAuth0Configured = () => {
  return !!(import.meta.env.VITE_AUTH0_DOMAIN && import.meta.env.VITE_AUTH0_CLIENT_ID);
};
```

- Si `VITE_AUTH0_DOMAIN` y `VITE_AUTH0_CLIENT_ID` están presentes → usa Auth0
- Si no → usa Manus OAuth

### Flujo de Autenticación con Auth0

1. Usuario hace clic en "Iniciar Sesión"
2. `auth0.login()` redirige a Auth0
3. Usuario se autentica en Auth0
4. Auth0 redirige de vuelta con código de autorización
5. SDK de Auth0 intercambia el código por tokens
6. Token se guarda en localStorage
7. Cliente tRPC incluye el token en header `Authorization`
8. Backend valida el token con Auth0
9. Usuario autenticado accede al dashboard

### Componentes Actualizados

- **MainLayout.tsx**: Separado en `MainLayoutAuth0` y `MainLayoutManus`
- **Sidebar.tsx**: Detecta el sistema activo y usa el hook correcto
- **useAuth0Custom.ts**: Maneja tokens y autenticación de Auth0
- **context.ts**: Prioriza Auth0 sobre Manus OAuth en el backend

## Verificación

Para verificar que Auth0 está configurado correctamente:

1. Abrir Railway en el navegador
2. Abrir DevTools (F12) > Console
3. Buscar el mensaje: `[MainLayout] Auth0 configured, using Auth0 authentication`
4. Hacer clic en "Iniciar Sesión"
5. Debería redirigir a Auth0 (NO a Manus OAuth)

## Troubleshooting

### Problema: Sigue intentando usar Manus OAuth
**Solución**: Verificar que las variables `VITE_*` estén configuradas en Railway y redesplegar

### Problema: Error "Missing or invalid Authorization header"
**Solución**: Verificar que el token se esté guardando en localStorage y enviando en las peticiones

### Problema: Error de CORS
**Solución**: Verificar que la URL de Railway esté en "Allowed Web Origins" en Auth0

### Problema: Redirect loop
**Solución**: Verificar que la URL de callback esté correctamente configurada en Auth0

## Logs Útiles

Para depurar problemas, buscar estos mensajes en los logs de Railway:

```
[Auth0] Authenticating request...
[Auth0] Token verified successfully
[Auth0] User found in database
[Auth0] User created with role: admin
```

Si ves `[Auth] Missing session cookie`, significa que está intentando usar Manus OAuth en lugar de Auth0.

## Contacto

Si los problemas persisten después de seguir estos pasos, revisar:
1. Que todas las variables estén correctamente escritas (sin espacios extra)
2. Que Railway haya redesplegado después de agregar las variables
3. Que Auth0 tenga las URLs correctas configuradas
4. Los logs del servidor en Railway para mensajes de error específicos
