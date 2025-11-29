# Guía de Migración a Auth0

## Resumen

Este documento describe la migración del sistema de autenticación personalizado con JWT a Auth0, una solución de autenticación robusta y escalable que resuelve los problemas de compatibilidad con Railway.

## Cambios Implementados

### 1. Dependencias Agregadas

**Cliente (React):**
- `@auth0/auth0-react@2.9.0` - SDK oficial de Auth0 para React

**Servidor (Node.js):**
- `express-oauth2-jwt-bearer@1.7.1` - Middleware para validar tokens JWT de Auth0

### 2. Archivos Nuevos Creados

#### Servidor

| Archivo | Descripción |
|---------|-------------|
| `server/_core/auth0Config.ts` | Configuración de Auth0 (domain, audience, issuer) |
| `server/_core/auth0Middleware.ts` | Middleware para validar tokens JWT de Auth0 |

#### Cliente

| Archivo | Descripción |
|---------|-------------|
| `client/src/_core/Auth0Provider.tsx` | Proveedor de Auth0 que envuelve la aplicación |
| `client/src/_core/hooks/useAuth0Custom.ts` | Hook personalizado para simplificar el uso de Auth0 |
| `client/src/pages/LoginAuth0.tsx` | Nueva página de login con Auth0 |

#### Documentación

| Archivo | Descripción |
|---------|-------------|
| `.env.example` | Ejemplo de variables de entorno necesarias |
| `AUTH0_SETUP.md` | Instrucciones detalladas de configuración de Auth0 |
| `MIGRATION_TO_AUTH0.md` | Este documento |

### 3. Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `client/src/main.tsx` | Envuelto la aplicación con `Auth0ProviderWrapper` |
| `package.json` | Agregadas nuevas dependencias |

## Próximos Pasos para Completar la Migración

### Paso 1: Configurar Auth0 Dashboard

1. **Crear API en Auth0:**
   - Ve a Applications > APIs
   - Crea una nueva API con identifier: `https://solar-project-manager-api`
   - Signing Algorithm: RS256

2. **Configurar URLs permitidas:**
   - Allowed Callback URLs: `https://solar-project-manager-production.up.railway.app, http://localhost:5000`
   - Allowed Logout URLs: `https://solar-project-manager-production.up.railway.app, http://localhost:5000`
   - Allowed Web Origins: `https://solar-project-manager-production.up.railway.app, http://localhost:5000`

### Paso 2: Configurar Variables de Entorno en Railway

Agrega las siguientes variables en Railway:

```
AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
AUTH0_AUDIENCE=https://solar-project-manager-api
AUTH0_CLIENT_SECRET=AY0swAEsPmI6P5Z5AQJ2FnCkDCBKwIKZyeUoBH6nsCapzvmm4xRE2LV_MNEAAMAx
VITE_AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
VITE_AUTH0_CLIENT_ID=70HeyKdFmooHu797hruq0L3Q0wva37f5
VITE_AUTH0_AUDIENCE=https://solar-project-manager-api
```

### Paso 3: Actualizar Rutas (Pendiente)

Necesitamos actualizar las rutas de la aplicación para usar la nueva página de login con Auth0:

- Cambiar `/login` para que use `LoginAuth0.tsx`
- Actualizar el middleware de autenticación en el servidor para usar Auth0
- Sincronizar usuarios de Auth0 con la base de datos local

### Paso 4: Migración de Usuarios Existentes

Los usuarios existentes en la base de datos local deberán:

1. Registrarse nuevamente con Auth0
2. O implementar un script de migración de usuarios a Auth0

## Beneficios de Auth0

✅ **Compatibilidad garantizada** con Railway y otros proveedores de hosting  
✅ **Seguridad robusta** con características avanzadas (MFA, detección de anomalías)  
✅ **Escalabilidad** automática según crece tu aplicación  
✅ **Menos mantenimiento** - Auth0 se encarga de la complejidad  
✅ **Cumplimiento** con estándares de seguridad (OAuth 2.0, OpenID Connect)  
✅ **Gestión centralizada** de usuarios desde el dashboard de Auth0  

## Notas Importantes

- El sistema actual de autenticación JWT permanece intacto por ahora
- La migración es gradual y no rompe la funcionalidad existente
- Una vez probado Auth0, se puede eliminar el código de autenticación antiguo
- Los tokens de Auth0 se guardan en localStorage para persistencia
- Se usan refresh tokens para mantener la sesión activa

## Soporte

Para cualquier problema con la configuración de Auth0, consulta:
- [Documentación oficial de Auth0](https://auth0.com/docs)
- [Auth0 React SDK](https://github.com/auth0/auth0-react)
- El archivo `AUTH0_SETUP.md` en este repositorio
