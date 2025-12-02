# Configuración de Google Calendar

Este documento explica cómo configurar la sincronización con Google Calendar en diferentes entornos.

## 📋 Resumen

La aplicación sincroniza automáticamente los hitos de proyectos con Google Calendar:
- **En Manus**: Usa MCP (Model Context Protocol) - configuración automática
- **En Railway**: Usa Google Calendar API con Service Account

## 🔧 Configuración para Railway

### Paso 1: Crear Service Account en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Calendar API**:
   - Ve a "APIs & Services" → "Library"
   - Busca "Google Calendar API"
   - Click en "Enable"

4. Crea un Service Account:
   - Ve a "APIs & Services" → "Credentials"
   - Click en "Create Credentials" → "Service Account"
   - Nombre: `solar-manager-calendar`
   - Descripción: `Service account for Solar Project Manager`
   - Click "Create and Continue"
   - Rol: "Editor" o "Owner"
   - Click "Done"

5. Genera una clave JSON:
   - Click en el Service Account creado
   - Ve a la pestaña "Keys"
   - Click "Add Key" → "Create new key"
   - Tipo: JSON
   - Click "Create"
   - **Guarda el archivo JSON descargado** (lo necesitarás en el siguiente paso)

### Paso 2: Compartir tu Google Calendar con el Service Account

1. Abre [Google Calendar](https://calendar.google.com/)
2. En "My calendars", encuentra tu calendario principal
3. Click en los tres puntos → "Settings and sharing"
4. En "Share with specific people", click "Add people"
5. Agrega el email del Service Account (está en el archivo JSON como `client_email`)
   - Ejemplo: `solar-manager-calendar@tu-proyecto.iam.gserviceaccount.com`
6. Permisos: "Make changes to events"
7. Click "Send"

### Paso 3: Configurar Variable de Entorno en Railway

1. Abre el archivo JSON descargado en el Paso 1
2. Copia **todo el contenido** del archivo (debe ser un JSON válido)
3. Ve a tu proyecto en Railway
4. Settings → Variables
5. Agrega una nueva variable:
   ```
   Nombre: GOOGLE_CALENDAR_CREDENTIALS
   Valor: [pega aquí el contenido completo del archivo JSON]
   ```

**Ejemplo del formato del JSON:**
```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-123456",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "solar-manager-calendar@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

6. Click "Add" y espera a que Railway redeploy automáticamente

### Paso 4: Verificar Funcionamiento

1. Crea un nuevo hito en cualquier proyecto
2. Verifica que aparezca el indicador "📅 Sincronizado" en azul
3. Abre tu Google Calendar y verifica que el evento se haya creado

## 🔍 Troubleshooting

### Error: "Calendar client not available"

**Causa**: La variable `GOOGLE_CALENDAR_CREDENTIALS` no está configurada o tiene formato incorrecto.

**Solución**:
1. Verifica que la variable esté en Railway
2. Asegúrate de que el valor sea un JSON válido (usa un validador JSON online)
3. Verifica que no haya espacios extra al inicio o final

### Error: "Insufficient Permission"

**Causa**: El Service Account no tiene permisos en tu calendario.

**Solución**:
1. Ve a Google Calendar → Settings
2. Verifica que el email del Service Account esté en "Share with specific people"
3. Asegúrate de que tenga permisos de "Make changes to events"

### Los eventos no aparecen en Google Calendar

**Causa**: Puede ser que el calendario compartido no sea el correcto.

**Solución**:
1. Verifica en los logs de Railway que no haya errores
2. Busca mensajes como `[GoogleCalendar] Event created via API: [event_id]`
3. Si ves errores, revisa los pasos anteriores

## 📊 Logs Útiles

En Railway, busca estos mensajes en los logs:

```
[GoogleCalendar] Creating event in Railway (API) environment
[GoogleCalendar] Event created via API: abc123xyz
```

Si ves errores, los logs mostrarán detalles específicos.

## 🔐 Seguridad

- **NUNCA** compartas el archivo JSON del Service Account públicamente
- **NUNCA** lo subas a GitHub o repositorios públicos
- Guárdalo solo como variable de entorno en Railway
- Si crees que se comprometió, elimina el Service Account y crea uno nuevo

## 🎯 Funcionalidades

Una vez configurado, la sincronización es automática:

- ✅ **Crear hito** → Se crea evento en Google Calendar
- ✅ **Actualizar hito** → Se actualiza evento en Google Calendar
- ✅ **Eliminar hito** → Se elimina evento de Google Calendar
- ✅ **Recordatorios**: 1 día antes y 1 hora antes (configurables)
- ✅ **Indicador visual**: Badge azul "📅 Sincronizado" en hitos sincronizados

## 📝 Notas

- Los eventos se crean en el calendario "primary" del Service Account
- La zona horaria por defecto es America/New_York (EST/EDT)
- Los eventos tienen duración de 1 hora por defecto
- Si falla la sincronización, el hito se crea de todas formas (no bloquea la operación)
