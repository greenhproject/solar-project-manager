# Variables de Entorno para Railway

## Variables Correctas de Auth0

Actualiza estas variables en Railway:

```
AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
AUTH0_AUDIENCE=https://solar-project-manager-api
VITE_AUTH0_DOMAIN=dev-s1tr6aqjujd8goqu.us.auth0.com
VITE_AUTH0_CLIENT_ID=70HeyKdFmooHu797hruq0L3QOwva37f5
VITE_AUTH0_AUDIENCE=https://solar-project-manager-api
```

## Nota Importante

El Client ID correcto es: **70HeyKdFmooHu797hruq0L3QOwva37f5**

- Contiene una 'O' mayúscula (no un '0' cero) en la posición 24: `...L3QOwva...`
- Domain correcto: `dev-s1tr6aqjujd8goqu.us.auth0.com` (con dos 'j')

## Pasos para Actualizar en Railway

1. Ve a tu proyecto en Railway
2. Haz clic en el servicio
3. Ve a la pestaña **Variables**
4. Actualiza la variable `VITE_AUTH0_CLIENT_ID` con el valor correcto
5. Guarda los cambios
6. Railway redesplegar á automáticamente
