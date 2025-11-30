# Guía Completa: Configurar Cloudinary para Subida de Archivos

Esta guía te ayudará a configurar Cloudinary paso a paso para que el sistema de archivos adjuntos funcione correctamente en Railway.

---

## 📋 Requisitos Previos

Ya tienes:
- ✅ Cuenta de Cloudinary creada
- ✅ Credenciales configuradas en Railway:
  - `CLOUDINARY_CLOUD_NAME=projectmanagerghhp`
  - `CLOUDINARY_API_KEY=693314713996472`
  - `CLOUDINARY_API_SECRET=-OmtPC3M9RJ1ag9zuuYYcdDU7Jc`

**Falta:** Crear el Upload Preset (paso crítico)

---

## 🎯 Paso 1: Crear Upload Preset

### 1.1 Acceder a Configuración

1. Inicia sesión en [Cloudinary Dashboard](https://cloudinary.com/console)
2. En el menú lateral izquierdo, haz clic en el ícono de **engranaje** (⚙️) o busca **"Settings"**
3. En la página de Settings, busca la pestaña **"Upload"** en la parte superior

### 1.2 Crear Nuevo Preset

1. Scroll hacia abajo hasta la sección **"Upload presets"**
2. Haz clic en el botón **"Add upload preset"** (botón azul)

### 1.3 Configurar el Preset

En el formulario que aparece, configura lo siguiente:

**Campos obligatorios:**

| Campo | Valor | Descripción |
|-------|-------|-------------|
| **Preset name** | `solar_project_manager` | Nombre exacto (sin espacios) |
| **Signing Mode** | **Unsigned** | ⚠️ MUY IMPORTANTE: Debe ser "Unsigned" |
| **Folder** | `solar-project-manager` | Carpeta donde se guardarán los archivos |

**Campos opcionales (recomendados):**

| Campo | Valor Recomendado | Descripción |
|-------|-------------------|-------------|
| **Use filename** | ✅ Activado | Mantiene el nombre original del archivo |
| **Unique filename** | ✅ Activado | Agrega sufijo único para evitar duplicados |
| **Overwrite** | ❌ Desactivado | Evita sobrescribir archivos existentes |
| **Resource type** | `Auto` | Detecta automáticamente el tipo (imagen/video/raw) |

### 1.4 Guardar

1. Scroll hasta el final del formulario
2. Haz clic en **"Save"**
3. Verás el nuevo preset en la lista con el nombre `solar_project_manager`

---

## ✅ Paso 2: Verificar Configuración

### 2.1 Confirmar que el Preset Existe

En la lista de Upload presets, debes ver:

```
Preset Name: solar_project_manager
Signing Mode: Unsigned
Folder: solar-project-manager
```

### 2.2 Agregar Variable de Entorno en Railway

1. Ve a tu proyecto en Railway
2. Selecciona el servicio de la aplicación
3. Ve a la pestaña **Variables**
4. Agrega esta variable (si no existe):

```
CLOUDINARY_UPLOAD_PRESET=solar_project_manager
```

5. Railway hará redeploy automáticamente

---

## 🧪 Paso 3: Probar la Carga de Archivos

### 3.1 Esperar Redeploy

Espera 2-3 minutos a que Railway complete el redeploy.

### 3.2 Probar Upload

1. Inicia sesión en tu aplicación (Railway o Manus)
2. Ve a cualquier proyecto
3. Scroll hasta la sección **"Archivos Adjuntos"**
4. Haz clic en **"Seleccionar Archivo"** o arrastra un archivo
5. Selecciona categoría y descripción
6. Haz clic en **"Subir Archivo"**

### 3.3 Verificar Éxito

**Si funciona:**
- ✅ Verás un mensaje "Archivo subido exitosamente"
- ✅ El archivo aparecerá en la lista de archivos del proyecto
- ✅ Podrás descargarlo haciendo clic

**Si falla:**
- ❌ Verás un mensaje de error
- ❌ Revisa los logs de Railway para ver el error específico

---

## 🔍 Paso 4: Verificar en Cloudinary

### 4.1 Ver Archivos Subidos

1. Ve al [Dashboard de Cloudinary](https://cloudinary.com/console)
2. En el menú lateral, haz clic en **"Media Library"**
3. Busca la carpeta **"solar-project-manager"**
4. Deberías ver los archivos que subiste desde la aplicación

### 4.2 Verificar URL Pública

Cada archivo tendrá una URL pública como:
```
https://res.cloudinary.com/projectmanagerghhp/raw/upload/solar-project-manager/project-123/attachments/...
```

---

## ❓ Troubleshooting

### Error: "Upload Preset no existe"

**Causa:** El preset no fue creado o tiene un nombre diferente.

**Solución:**
1. Verifica que el preset se llame exactamente `solar_project_manager` (sin espacios, sin mayúsculas)
2. Verifica que esté en modo **"Unsigned"**
3. Recrea el preset si es necesario

### Error: "Invalid signature"

**Causa:** El preset está en modo "Signed" en lugar de "Unsigned".

**Solución:**
1. Ve a Settings → Upload → Upload presets
2. Edita el preset `solar_project_manager`
3. Cambia **Signing Mode** a **"Unsigned"**
4. Guarda

### Error: "Cloudinary no configurado"

**Causa:** Faltan variables de entorno en Railway.

**Solución:**
Verifica que estas 4 variables existan en Railway:
```
CLOUDINARY_CLOUD_NAME=projectmanagerghhp
CLOUDINARY_API_KEY=693314713996472
CLOUDINARY_API_SECRET=-OmtPC3M9RJ1ag9zuuYYcdDU7Jc
CLOUDINARY_UPLOAD_PRESET=solar_project_manager
```

### Los archivos no aparecen en la lista

**Causa:** Error en la base de datos o permisos.

**Solución:**
1. Revisa los logs de Railway para ver errores específicos
2. Verifica que el usuario tenga permisos en el proyecto
3. Verifica que la tabla `project_attachments` exista en la base de datos

---

## 📊 Límites del Plan Gratuito

Cloudinary Free Tier incluye:
- ✅ 25 GB de almacenamiento
- ✅ 25 GB de ancho de banda/mes
- ✅ 25,000 transformaciones/mes
- ✅ Soporte para todos los formatos (imágenes, videos, documentos)

**Suficiente para:**
- ~2,500 archivos de 10MB cada uno
- ~25,000 descargas de archivos de 1MB/mes

---

## 📞 Soporte

Si después de seguir esta guía sigues teniendo problemas:

1. **Revisa los logs de Railway:**
   - Railway → Tu servicio → Deployments → Ver logs
   - Busca mensajes que contengan `[Cloudinary]` o `[Storage]`

2. **Verifica la configuración:**
   - Cloudinary Dashboard → Settings → Upload → Upload presets
   - Railway → Variables → Verifica las 4 variables

3. **Prueba en local:**
   - Configura las mismas variables en `.env` local
   - Ejecuta `pnpm dev` y prueba subir un archivo
   - Revisa la consola para ver errores detallados

---

## ✅ Checklist Final

Antes de considerar que está configurado correctamente:

- [ ] Upload Preset `solar_project_manager` creado en Cloudinary
- [ ] Preset configurado en modo **Unsigned**
- [ ] Preset configurado con folder `solar-project-manager`
- [ ] 4 variables de entorno agregadas en Railway
- [ ] Railway ha completado el redeploy
- [ ] Probado subir un archivo desde la aplicación
- [ ] Archivo aparece en la lista de archivos del proyecto
- [ ] Archivo aparece en Media Library de Cloudinary
- [ ] Archivo se puede descargar correctamente

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, el sistema de archivos adjuntos funcionará correctamente tanto en Railway como en Manus (que usa su propio sistema de storage).
