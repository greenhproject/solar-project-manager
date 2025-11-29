# Configuración de Auth0 para Solar Project Manager

## 1. Credenciales de Auth0

Las siguientes credenciales fueron obtenidas del dashboard de Auth0:

- **Domain**: `dev-s1tr6aqjud8goqu.us.auth0.com`
- **Client ID**: `70HeyKdFmooHu797hruq0L3Q0wva37f5`
- **Client Secret**: `AY0swAEsPmI6P5Z5AQJ2FnCkDCBKwIKZyeUoBH6nsCapzvmm4xRE2LV_MNEAAMAx`
- **Audience**: `https://solar-project-manager-api`

## 2. Configuración en Auth0 Dashboard

### URLs Permitidas

En la configuración de la aplicación en Auth0, debes agregar las siguientes URLs:

**Allowed Callback URLs:**
```
https://solar-project-manager-production.up.railway.app, http://localhost:5000
```

**Allowed Logout URLs:**
```
https://solar-project-manager-production.up.railway.app, http://localhost:5000
```

**Allowed Web Origins:**
```
https://solar-project-manager-production.up.railway.app, http://localhost:5000
```

### Crear API en Auth0

1. Ve a **Applications > APIs** en el dashboard de Auth0
2. Haz clic en **Create API**
3. Configura:
   - **Name**: Solar Project Manager API
   - **Identifier**: `https://solar-project-manager-api`
   - **Signing Algorithm**: RS256
4. Guarda la API

## 3. Variables de Entorno en Railway

Debes configurar las siguientes variables de entorno en Railway:

### Variables del Servidor:
```
AUTH0_DOMAIN=dev-s1tr6aqjud8goqu.us.auth0.com
AUTH0_AUDIENCE=https://solar-project-manager-api
AUTH0_CLIENT_SECRET=AY0swAEsPmI6P5Z5AQJ2FnCkDCBKwIKZyeUoBH6nsCapzvmm4xRE2LV_MNEAAMAx
```

### Variables del Cliente (VITE_):
```
VITE_AUTH0_DOMAIN=dev-s1tr6aqjud8goqu.us.auth0.com
VITE_AUTH0_CLIENT_ID=70HeyKdFmooHu797hruq0L3Q0wva37f5
VITE_AUTH0_AUDIENCE=https://solar-project-manager-api
```

## 4. Pasos para Configurar en Railway

1. Ve a tu proyecto en Railway
2. Haz clic en la pestaña **Variables**
3. Agrega cada una de las variables mencionadas arriba
4. Guarda los cambios
5. Railway automáticamente redesplegar á la aplicación

## 5. Verificación

Una vez configurado, la aplicación usará Auth0 para la autenticación. Los usuarios podrán:

- Iniciar sesión con Auth0
- Registrarse usando Auth0
- Cerrar sesión de forma segura
- Mantener la sesión activa con refresh tokens

## 6. Gestión de Usuarios

Los usuarios se gestionarán en el dashboard de Auth0. Puedes:

- Ver todos los usuarios en **User Management > Users**
- Asignar roles y permisos
- Configurar autenticación multifactor (MFA)
- Ver logs de autenticación

## 7. Cuenta Administrador Principal

La cuenta `greenhproject@gmail.com` debe ser configurada como administrador principal en la base de datos local después del primer login con Auth0.
