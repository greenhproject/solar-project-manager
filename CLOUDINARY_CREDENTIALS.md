# Credenciales Correctas de Cloudinary para Railway

## Variables de Entorno Requeridas

Configurar estas variables en Railway → Settings → Variables:

```bash
CLOUDINARY_CLOUD_NAME=dx25wtuzh
CLOUDINARY_API_KEY=693314713996472
CLOUDINARY_API_SECRET=-OmtPC3M9RJ1ag9zuuYYcdDU7Jc
```

## ⚠️ Nota Importante

**NO usar `projectmanagerghhp` como Cloud Name**. Ese es el nombre del API Key, no el Cloud Name.

El Cloud Name correcto es **`dx25wtuzh`** (visible en el Dashboard de Cloudinary).

## Verificación

Después de configurar las variables:

1. Railway hará redeploy automáticamente (1-2 minutos)
2. Probar subir un archivo en cualquier proyecto
3. Verificar en logs que aparezca:
   ```
   [Storage] Detected Railway environment (has Cloudinary config)
   [Storage] Using Cloudinary (Railway environment)
   [Cloudinary] Uploading file: ...
   [Cloudinary] Upload successful: ...
   ```
4. Verificar en Cloudinary Media Library que el archivo aparezca en la carpeta `solar-project-manager/`

## Troubleshooting

Si sigue fallando:

- Verificar que las 3 variables estén configuradas
- Verificar que no haya espacios al inicio o final de los valores
- Revisar logs de Railway para ver el error específico
- Verificar que el API Key esté activo en Cloudinary (Settings → Security → API Keys)
