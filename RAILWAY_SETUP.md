# Configuración de Railway - Solar Project Manager

Este documento explica cómo configurar las variables de entorno necesarias para que el proyecto funcione correctamente en Railway.

## 📋 Variables de Entorno Requeridas

### 1. Sistema de Almacenamiento de Archivos (Cloudinary)

El sistema de archivos adjuntos requiere una cuenta gratuita de Cloudinary.

**Pasos para obtener credenciales:**

1. Crear cuenta en https://cloudinary.com/users/register_free
2. Ir al Dashboard
3. Copiar las credenciales:

```env
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
CLOUDINARY_UPLOAD_PRESET=solar_project_manager
```

**Crear Upload Preset:**
1. En Cloudinary, ir a **Settings** → **Upload**
2. Scroll a **Upload presets** → **Add upload preset**
3. Configurar:
   - **Preset name**: `solar_project_manager`
   - **Signing Mode**: **Unsigned**
   - **Folder**: `solar-project-manager`
4. Guardar

**Plan gratuito de Cloudinary:**
- 25 GB de almacenamiento
- 25 GB de ancho de banda/mes
- Suficiente para proyectos pequeños/medianos

---

### 2. Integración con OpenSolar

El sistema usa autenticación con email/contraseña de OpenSolar.

```env
OPENSOLAR_EMAIL=tu-email@opensolar.com
OPENSOLAR_PASSWORD=tu-contraseña
OPENSOLAR_ORG_ID=tu-organization-id
```

**Cómo obtener Organization ID:**
1. Iniciar sesión en OpenSolar
2. Ir a Settings → Organization
3. Copiar el Organization ID

**Nota:** Las credenciales deben tener permisos de lectura en la API de OpenSolar.

---

### 3. Base de Datos (TiDB/MySQL)

Railway proporciona automáticamente estas variables cuando agregas un servicio de base de datos:

```env
DATABASE_URL=mysql://user:password@host:port/database
```

**Importante:** Asegúrate de que el servicio de base de datos esté conectado al servicio de la aplicación.

---

### 4. Autenticación (Manus OAuth)

Estas variables ya están configuradas automáticamente por Manus:

```env
JWT_SECRET=auto-generado
OAUTH_SERVER_URL=https://api.manus.im
VITE_APP_ID=tu-app-id
VITE_OAUTH_PORTAL_URL=https://manus.im/app-auth
```

**No necesitas modificar estas variables.**

---

## 🚀 Pasos de Configuración en Railway

### 1. Agregar Variables de Entorno

1. Ve a tu proyecto en Railway
2. Selecciona el servicio de la aplicación
3. Ve a la pestaña **Variables**
4. Agrega cada variable una por una:
   - Click en **+ New Variable**
   - Pega el nombre y valor
   - Click en **Add**

### 2. Verificar Servicios Conectados

1. Asegúrate de que el servicio de base de datos esté conectado
2. Railway generará automáticamente `DATABASE_URL`

### 3. Redeploy

1. Después de agregar todas las variables, haz click en **Deploy**
2. O espera a que Railway detecte cambios en GitHub

---

## 🧪 Verificar Configuración

### Sistema de Archivos

1. Inicia sesión en la aplicación
2. Ve a cualquier proyecto
3. Intenta subir un archivo en la sección "Archivos Adjuntos"
4. Si funciona, verás el archivo listado

**Si falla:**
- Verifica que las 4 variables de Cloudinary estén configuradas
- Verifica que el Upload Preset exista en Cloudinary
- Revisa los logs de Railway para ver errores específicos

### OpenSolar

1. Crea un nuevo proyecto
2. Ingresa un ID de OpenSolar válido
3. Haz click en "Cargar" o "Sincronizar Ahora"
4. Si funciona, los datos se autocompletarán

**Si falla:**
- Verifica que `OPENSOLAR_EMAIL`, `OPENSOLAR_PASSWORD` y `OPENSOLAR_ORG_ID` estén configurados
- Verifica que las credenciales sean correctas
- Verifica que el Organization ID sea correcto
- Revisa los logs de Railway para ver errores de autenticación

---

## 📊 Variables de Entorno Completas

```env
# Base de Datos (auto-generado por Railway)
DATABASE_URL=mysql://...

# Cloudinary (Sistema de Archivos)
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret
CLOUDINARY_UPLOAD_PRESET=solar_project_manager

# OpenSolar
OPENSOLAR_EMAIL=tu-email@opensolar.com
OPENSOLAR_PASSWORD=tu-contraseña
OPENSOLAR_ORG_ID=tu-organization-id

# Manus OAuth (ya configurado automáticamente)
JWT_SECRET=...
OAUTH_SERVER_URL=...
VITE_APP_ID=...
VITE_OAUTH_PORTAL_URL=...
```

---

## 🔍 Logs y Debugging

Para ver logs en Railway:
1. Ve a tu servicio
2. Click en la pestaña **Deployments**
3. Click en el deployment activo
4. Verás los logs en tiempo real

**Logs útiles:**
- `[Storage] Using Cloudinary (Railway environment)` - Sistema de archivos detectado
- `[OpenSolar] Token obtenido exitosamente` - Autenticación OpenSolar exitosa
- `[OpenSolar] Project retrieved successfully` - Proyecto cargado desde OpenSolar

---

## ❓ Problemas Comunes

### Error: "Cloudinary no configurado"
**Solución:** Agrega las 4 variables de Cloudinary en Railway

### Error: "Cliente de OpenSolar no configurado"
**Solución:** Agrega `OPENSOLAR_EMAIL`, `OPENSOLAR_PASSWORD` y `OPENSOLAR_ORG_ID`

### Error: "Autenticación OpenSolar falló"
**Solución:** Verifica que el email y contraseña sean correctos

### Error: "Upload preset not found"
**Solución:** Crea el upload preset en Cloudinary con el nombre exacto `solar_project_manager`

---

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs de Railway
2. Verifica que todas las variables estén configuradas
3. Verifica que los servicios externos (Cloudinary, OpenSolar) estén funcionando
