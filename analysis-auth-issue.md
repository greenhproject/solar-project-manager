# Análisis del problema de autenticación

## Hallazgos de los logs de Railway:

1. **El deploy SÍ está activo** con el código correcto:
   - Línea 106: `[Auth0] User role updated to admin for sub: google-oauth2|106723310869919984535`
   - Línea 288: `[SSO Callback] Actualizando rol de client → admin para greenhproject@gmail.com`
   - Línea 291: `[SSO Callback] Login exitoso: greenhproject@gmail.com (admin) → /dashboard`

2. **El SSO funciona correctamente** - actualiza el rol a admin y redirige a /dashboard

3. **El problema con Auth0 web**: 
   - Línea 96-97: Cuando Auth0 web autentica, PRIMERO limpia cookies (logout) y LUEGO hace Auth0 auth
   - Pero hay un problema de **prioridad**: el context.ts tiene `hasJWTSessionCookie` primero
   - Cuando entras por Auth0 web, el browser todavía tiene la cookie JWT del SSO
   - El backend ve la cookie JWT primero y resuelve al usuario por JWT (que tiene rol de la BD)
   - PERO el Auth0 service SÍ actualiza el rol a admin (línea 106)

4. **Problema real**: El rol se cambia a `client` DESPUÉS del deploy
   - El deploy fue a las 04:24 UTC
   - A las 06:09 UTC, Auth0 dice "User role updated to admin" → el rol era client antes
   - Algo ENTRE el deploy y las 06:09 cambió el rol a client

5. **Posible causa**: Hay un proceso que importa usuarios de OpenSolar via webhook
   que podría estar sobrescribiendo el rol

## Problema de Gestión de Usuarios (todo en 0):
- `users.list` requiere `adminProcedure`
- Cuando la request usa JWT cookie, el JWT payload solo tiene userId/email/name
- El rol se carga de la BD con `getUserByOpenId` o similar
- Si en ese momento la BD tiene role='client', la query falla con FORBIDDEN
- El frontend muestra 0 porque los queries fallan silenciosamente

## Solución propuesta:
1. El JWT cookie NO debe tener prioridad sobre Auth0 Bearer token cuando AMBOS están presentes
2. Si hay Authorization Bearer header Y cookie JWT, preferir el Bearer (Auth0 es más reciente)
3. Esto asegura que Auth0 siempre resuelva correctamente el rol
