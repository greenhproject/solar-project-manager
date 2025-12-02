# Configuración de Resend para Notificaciones por Email

Este documento explica cómo configurar Resend para enviar notificaciones por correo electrónico.

## 📋 Resumen

La aplicación envía automáticamente emails para:
- ⏰ **Hitos próximos a vencer** (3 días antes)
- 🚨 **Hitos vencidos**
- 🎉 **Proyectos completados**
- 📋 **Proyectos asignados** a ingenieros

## 🔧 Configuración en Resend

### Paso 1: Crear Cuenta en Resend

1. Ve a [Resend](https://resend.com/)
2. Crea una cuenta o inicia sesión
3. Verifica tu email

### Paso 2: Verificar Dominio (Recomendado para Producción)

**Opción A: Usar dominio propio (Recomendado)**

1. Ve a **Domains** en el dashboard de Resend
2. Click en **Add Domain**
3. Ingresa tu dominio (ejemplo: `greenhproject.com`)
4. Agrega los registros DNS que Resend te proporciona:
   - **SPF** (TXT)
   - **DKIM** (TXT)
   - **DMARC** (TXT)
5. Espera a que se verifique (puede tomar hasta 48 horas)

**Opción B: Usar subdominio de Resend (Solo para pruebas)**

- Puedes usar `onboarding@resend.dev` para pruebas
- **LIMITACIÓN**: Solo puedes enviar a tu propio email
- **NO usar en producción**

### Paso 3: Crear API Key

1. Ve a **API Keys** en el dashboard de Resend
2. Click en **Create API Key**
3. Nombre: `Solar Project Manager - Production`
4. Permisos: **Sending access**
5. Click **Create**
6. **Copia la API Key** (solo se muestra una vez)

### Paso 4: Configurar Variables de Entorno

#### En Railway:

1. Ve a tu proyecto en Railway
2. Settings → Variables
3. Agrega estas variables:

```
RESEND_API_KEY=re_123abc... (la API key que copiaste)
RESEND_FROM_EMAIL=noreply@tudominio.com (o el email verificado)
```

**Ejemplos de `RESEND_FROM_EMAIL`:**
- Con dominio propio: `noreply@greenhproject.com`
- Con subdominio de Resend (solo pruebas): `onboarding@resend.dev`

4. Click "Add" y espera a que Railway redeploy

#### En Manus (Desarrollo):

Las variables ya están configuradas. Si necesitas cambiarlas:

1. Ve a Settings en Manus
2. Busca las variables de entorno
3. Actualiza `RESEND_API_KEY` y `RESEND_FROM_EMAIL`

## 📧 Tipos de Emails que se Envían

### 1. Hito Próximo a Vencer

**Cuándo:** 3 días antes de la fecha de vencimiento

**Destinatario:** Ingeniero asignado al proyecto

**Contenido:**
- Nombre del proyecto
- Nombre del hito
- Fecha de vencimiento
- Días restantes

### 2. Hito Vencido

**Cuándo:** Cuando un hito pasa su fecha de vencimiento

**Destinatario:** Ingeniero asignado al proyecto

**Contenido:**
- Nombre del proyecto
- Nombre del hito
- Fecha de vencimiento
- Días de retraso

### 3. Proyecto Completado

**Cuándo:** Cuando un proyecto alcanza 100% de completitud

**Destinatario:** Ingeniero asignado al proyecto

**Contenido:**
- Nombre del proyecto
- Ubicación
- Duración total en días

### 4. Proyecto Asignado

**Cuándo:** Cuando se crea un proyecto con ingeniero asignado

**Destinatario:** Ingeniero asignado

**Contenido:**
- Nombre del proyecto
- Ubicación
- Fecha de inicio

## 🔍 Verificar Funcionamiento

### En Desarrollo (Manus):

1. Crea un proyecto y asígnalo a un ingeniero
2. Verifica que el email del ingeniero esté en la base de datos
3. Revisa los logs del servidor:
   ```
   [Project Create] Email sent to engineer@example.com for project assignment
   ```

### En Producción (Railway):

1. Revisa los logs de Railway para ver si hay errores
2. Busca mensajes como:
   ```
   [Email] Email sent successfully: abc123xyz
   ```
3. Si ves errores, verifica:
   - Que `RESEND_API_KEY` esté configurada
   - Que `RESEND_FROM_EMAIL` esté verificado en Resend
   - Que el email del destinatario sea válido

## 🚨 Troubleshooting

### Error: "Email not configured"

**Causa**: `RESEND_API_KEY` no está configurada

**Solución**:
1. Verifica que la variable esté en Railway
2. Asegúrate de que no tenga espacios extra
3. Redeploy el proyecto

### Error: "Invalid API key"

**Causa**: La API key es incorrecta o fue eliminada

**Solución**:
1. Ve a Resend → API Keys
2. Verifica que la key exista
3. Si no existe, crea una nueva
4. Actualiza `RESEND_API_KEY` en Railway

### Error: "Domain not verified"

**Causa**: El dominio en `RESEND_FROM_EMAIL` no está verificado

**Solución**:
1. Ve a Resend → Domains
2. Verifica que tu dominio esté verificado (check verde)
3. Si no está verificado, revisa los registros DNS
4. Para pruebas, usa `onboarding@resend.dev`

### Los emails no llegan

**Posibles causas:**

1. **Email en spam**: Revisa la carpeta de spam
2. **Email del usuario no existe**: Verifica que el ingeniero tenga email en la base de datos
3. **Dominio no verificado**: Usa un dominio verificado
4. **Límite de envío alcanzado**: Revisa el plan de Resend

**Verificación:**

1. Revisa los logs de Railway:
   ```
   [Email] Email sent successfully: [id]
   ```
2. Ve a Resend → Logs para ver el estado de cada email
3. Verifica que el email del destinatario sea correcto

## 📊 Límites de Resend

**Plan Gratuito:**
- 100 emails/día
- 3,000 emails/mes

**Plan Pro:**
- 50,000 emails/mes
- $20/mes

Para más información: https://resend.com/pricing

## 🔐 Seguridad

- **NUNCA** compartas tu `RESEND_API_KEY` públicamente
- **NUNCA** la subas a GitHub o repositorios públicos
- Guárdala solo como variable de entorno en Railway
- Si crees que se comprometió, elimínala y crea una nueva

## 📝 Plantillas de Email

Las plantillas están en `server/emailService.ts`:

- `sendMilestoneDueSoonEmail()`
- `sendMilestoneOverdueEmail()`
- `sendProjectCompletedEmail()`
- `sendProjectAssignedEmail()`
- `sendGenericNotificationEmail()`

Todas usan un diseño HTML responsivo con el branding de Solar Project Manager.

## 🎨 Personalización

Para personalizar los emails, edita `server/emailService.ts`:

1. **Cambiar colores**: Modifica el CSS en `getEmailTemplate()`
2. **Agregar logo**: Agrega una imagen en el header
3. **Cambiar textos**: Modifica las funciones de envío

## ✅ Checklist de Configuración

- [ ] Cuenta creada en Resend
- [ ] Dominio verificado (o usar onboarding@resend.dev para pruebas)
- [ ] API Key creada
- [ ] `RESEND_API_KEY` configurada en Railway
- [ ] `RESEND_FROM_EMAIL` configurada en Railway
- [ ] Proyecto redeployado en Railway
- [ ] Email de prueba enviado correctamente
- [ ] Emails aparecen en Resend → Logs
