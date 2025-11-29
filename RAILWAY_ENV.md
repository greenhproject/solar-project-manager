# Variables de Entorno para Railway

Este documento lista todas las variables de entorno necesarias para desplegar Solar Project Manager en Railway.

## Variables Requeridas

### Base de Datos

```
DATABASE_URL=mysql://user:password@host:port/database
```

**Descripción:** URL de conexión a la base de datos MySQL/TiDB de Railway.  
**Ejemplo:** `mysql://root:password@containers-us-west-123.railway.app:3306/railway`

### Autenticación JWT

```
JWT_SECRET=tu_secreto_jwt_muy_seguro_aqui
```

**Descripción:** Secreto para firmar tokens JWT. Debe ser una cadena aleatoria y segura.  
**Ejemplo:** `jwt_secret_super_seguro_random_string_12345`  
**Generación:** Puedes generar uno con: `openssl rand -base64 32`

### Configuración de la Aplicación

```
NODE_ENV=production
```

**Descripción:** Entorno de ejecución de Node.js.  
**Valor:** `production`

```
PORT=3000
```

**Descripción:** Puerto en el que escucha la aplicación (Railway lo asigna automáticamente).  
**Valor:** `3000` (Railway puede sobreescribirlo)

## Variables Opcionales (Solo para funciones avanzadas)

### OAuth de Manus (NO necesario para Railway)

```
# ESTAS VARIABLES NO SON NECESARIAS EN RAILWAY
# Solo se usan en el entorno de Manus
# OAUTH_SERVER_URL=https://api.manus.im
# VITE_APP_ID=tu-app-id
# VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
```

### OpenSolar API (Opcional)

```
OPENSOLAR_API_KEY=tu_api_key_de_opensolar
OPENSOLAR_API_URL=https://api.opensolar.com
```

**Descripción:** Credenciales para integración con OpenSolar (opcional).

## Configuración en Railway

1. **Crear Base de Datos MySQL:**
   - En Railway, agrega un servicio "MySQL"
   - Railway generará automáticamente `DATABASE_URL`

2. **Agregar Variables de Entorno:**
   - Ve a tu servicio en Railway
   - Click en "Variables"
   - Agrega cada variable listada arriba

3. **Desplegar:**
   - Railway detectará automáticamente el `nixpacks.toml`
   - El build ejecutará: `pnpm install` → `pnpm build` → `pnpm db:push`
   - El servidor iniciará con: `pnpm start`

## Verificación

Después del despliegue, verifica que:

- ✅ La aplicación está corriendo (sin errores 500)
- ✅ Puedes acceder a `/login` y `/register`
- ✅ Puedes crear una cuenta nueva
- ✅ Puedes iniciar sesión
- ✅ El dashboard carga correctamente

## Troubleshooting

### Error: "Database not available"

- Verifica que `DATABASE_URL` esté configurada correctamente
- Asegúrate de que la base de datos MySQL esté corriendo

### Error: "Invalid JWT session cookie"

- Verifica que `JWT_SECRET` esté configurada
- Asegúrate de que sea la misma en todos los despliegues

### Error: "Table already exists"

- El comando `pnpm db:push` sincroniza automáticamente el schema
- Si hay problemas, puedes ejecutar manualmente: `pnpm drizzle-kit push`

## Notas Importantes

1. **NO uses OAuth de Manus en Railway** - El sistema detecta automáticamente el entorno y usa JWT
2. **JWT_SECRET debe ser seguro** - Usa una cadena aleatoria larga
3. **DATABASE_URL es sensible** - No la compartas públicamente
4. **El primer usuario registrado** puede ser promovido a admin manualmente en la base de datos

## Promover Usuario a Admin

Para promover un usuario a administrador después del registro:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

Ejecuta este comando en la consola de MySQL de Railway.
