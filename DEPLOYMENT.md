# Guía de Despliegue - Solar Project Manager

Esta guía explica cómo desplegar Solar Project Manager en diferentes plataformas de hosting.

## 📋 Requisitos Previos

Antes de desplegar, asegúrate de tener preparado lo siguiente. La aplicación requiere una base de datos MySQL o TiDB con las credenciales de conexión correspondientes. También necesitarás configurar el almacenamiento de archivos, ya sea mediante AWS S3 o una alternativa compatible. Finalmente, deberás tener listas todas las variables de entorno que se detallan más adelante en este documento.

## 🚀 Opciones de Despliegue

### Opción 1: Vercel (Recomendado para facilidad)

Vercel es una plataforma ideal para aplicaciones Node.js con frontend React, ofreciendo un proceso de despliegue simplificado y optimizado.

**Proceso de despliegue:**

Primero, crea una cuenta en https://vercel.com si aún no tienes una. Luego, desde el dashboard de Vercel, importa el proyecto desde GitHub conectando tu cuenta y seleccionando el repositorio `greenhproject/solar-project-manager`. Durante la configuración, deberás agregar todas las variables de entorno necesarias en la sección correspondiente, asegurándote de marcarlas como variables de producción.

En la configuración de build, establece el comando de construcción como `pnpm build`, el directorio de salida como `dist`, y el comando de instalación como `pnpm install`. Una vez configurado todo, inicia el despliegue y espera entre 2 y 5 minutos para que se complete el proceso.

**Consideraciones importantes:**

Vercel soporta funciones serverless automáticamente, por lo que no necesitas configuración adicional para el backend. Sin embargo, la base de datos debe ser accesible desde internet. Puedes configurar un dominio personalizado directamente desde el dashboard de Vercel una vez que el despliegue esté completo.

### Opción 2: Railway

Railway es una excelente opción para aplicaciones full-stack, especialmente porque puede incluir la base de datos en el mismo servicio.

**Proceso de despliegue:**

Crea una cuenta en https://railway.app y desde el dashboard, selecciona "New Project" y luego "Deploy from GitHub repo". Autoriza el acceso a GitHub y selecciona el repositorio `solar-project-manager`. Railway te permite agregar una base de datos MySQL directamente desde el proyecto haciendo clic en "+ New" y seleccionando "Database" → "MySQL", lo cual creará automáticamente una instancia de base de datos.

Configura todas las variables de entorno necesarias en la pestaña "Variables". Railway auto-configura `DATABASE_URL` si usas su servicio de MySQL. En la sección de configuración de despliegue, establece el comando de inicio como `pnpm start` y el comando de build como `pnpm build`.

**Ventajas de Railway:**

Railway despliega automáticamente cada vez que haces push a la rama main de GitHub. Incluye una base de datos MySQL gratuita con 500MB de almacenamiento y soporta variables de entorno separadas por ambiente. Puedes obtener la URL pública de tu aplicación desde "Settings" → "Domains".

### Opción 3: Render

Render ofrece una opción de hosting gratuito con algunas limitaciones, pero es suficiente para proyectos pequeños o de prueba.

**Proceso de despliegue:**

Regístrate en https://render.com y desde el dashboard, selecciona "New +" → "Web Service". Conecta tu cuenta de GitHub y selecciona el repositorio del proyecto. Configura el servicio con el nombre `solar-project-manager`, selecciona Node como entorno, y establece el comando de build como `pnpm install && pnpm build` y el comando de inicio como `pnpm start`.

Para la base de datos, puedes crear una instancia de PostgreSQL desde "New +" → "PostgreSQL" o usar un servicio MySQL externo. Copia la URL de conexión y agrégala a las variables de entorno junto con todas las demás variables necesarias.

**Limitaciones del plan gratuito:**

Los servicios gratuitos de Render tienen limitaciones de CPU y memoria, y se duermen después de 15 minutos de inactividad, lo que significa que la primera petición después de ese tiempo puede tardar varios segundos. El soporte para dominios personalizados está disponible solo en planes pagos.

### Opción 4: DigitalOcean App Platform

DigitalOcean App Platform es ideal si necesitas mayor control sobre la infraestructura y recursos dedicados.

**Proceso de despliegue:**

Crea una cuenta en https://www.digitalocean.com y navega a la sección Apps. Selecciona "Create App" y elige GitHub como fuente, autorizando el acceso y seleccionando el repositorio. DigitalOcean detecta automáticamente que es una aplicación Node.js y sugiere los comandos de build (`pnpm build`) y ejecución (`pnpm start`).

Durante el proceso de configuración, puedes agregar una base de datos MySQL directamente desde el wizard, y DigitalOcean configurará automáticamente la variable `DATABASE_URL`. Agrega todas las demás variables de entorno en la sección correspondiente, marcando las sensibles como "Encrypted".

**Características destacadas:**

DigitalOcean incluye base de datos MySQL administrada con backups automáticos, ofrece escalado automático según la demanda, y proporciona monitoreo y logs integrados. El despliegue inicial toma entre 5 y 10 minutos.

## 🔐 Variables de Entorno Necesarias

### Variables Esenciales (REQUERIDAS)

**DATABASE_URL**: URL de conexión a la base de datos MySQL o TiDB. El formato es `mysql://usuario:contraseña@host:puerto/nombre_base_datos`. Por ejemplo: `mysql://root:password@localhost:3306/solar_project_manager`.

**JWT_SECRET**: Secreto utilizado para firmar tokens JWT de sesión. Debe ser una cadena aleatoria y segura, por ejemplo: `tu_secreto_jwt_muy_seguro_aleatorio_de_al_menos_32_caracteres`.

### Variables de Autenticación Manus OAuth (si usas el sistema de Manus)

**OAUTH_SERVER_URL**: URL del servidor de OAuth de Manus. Valor por defecto: `https://api.manus.im`.

**VITE_OAUTH_PORTAL_URL**: URL del portal de login para el frontend. Valor por defecto: `https://oauth.manus.im`.

**VITE_APP_ID**: ID de la aplicación en el sistema OAuth de Manus.

### Variables de APIs de Manus (para LLM y almacenamiento S3)

**BUILT_IN_FORGE_API_URL**: URL de las APIs de Manus para el backend. Valor por defecto: `https://forge.manus.im`.

**BUILT_IN_FORGE_API_KEY**: Clave de API para acceso desde el backend a servicios de LLM, S3 y notificaciones.

**VITE_FRONTEND_FORGE_API_URL**: URL de las APIs de Manus para el frontend. Valor por defecto: `https://forge.manus.im`.

**VITE_FRONTEND_FORGE_API_KEY**: Clave de API para acceso desde el frontend.

### Variables Opcionales

**OPENSOLAR_API_KEY**: Clave de API de OpenSolar para sincronización de proyectos. Puedes obtenerla en https://opensolar.com/developers.

**OPENSOLAR_ORG_ID**: ID de tu organización en OpenSolar.

**VITE_ANALYTICS_ENDPOINT**: URL del servicio de analytics. Valor por defecto Manus: `https://analytics.manus.im`.

**VITE_ANALYTICS_WEBSITE_ID**: ID del sitio web en el servicio de analytics.

**VITE_APP_TITLE**: Título de la aplicación que aparece en el navegador. Valor por defecto: `Solar Project Manager`.

**VITE_APP_LOGO**: Ruta del logo (debe estar en `client/public/`). Valor por defecto: `/logo.png`.

## 🔄 Migraciones de Base de Datos

Después de desplegar la aplicación, es crucial ejecutar las migraciones de base de datos para crear todas las tablas necesarias.

### Desde tu máquina local

Configura la variable `DATABASE_URL` en tu archivo `.env` local apuntando a la base de datos de producción y ejecuta el comando `pnpm db:push`. Por ejemplo:

```bash
DATABASE_URL="mysql://user:pass@production-host/db" pnpm db:push
```

### Desde el servidor

Si tu plataforma de hosting ofrece acceso SSH o una consola web, puedes ejecutar directamente:

```bash
pnpm db:push
```

### Cargar datos iniciales

Para cargar los tipos de proyecto predefinidos (Residencial, Comercial, Industrial, etc.), ejecuta:

```bash
npx tsx seed-data.mjs
```

Este script crea los 5 tipos de proyecto con sus respectivas plantillas de hitos.

## 🌐 Configurar Dominio Personalizado

### En Vercel

Navega al dashboard de tu proyecto, ve a Settings → Domains, y agrega tu dominio personalizado (por ejemplo, `solar.greenhproject.com`). Vercel te proporcionará las instrucciones de configuración DNS que debes aplicar en tu proveedor de dominios.

### En Railway

Desde el proyecto, ve a Settings → Domains. Puedes generar un dominio automático o agregar un dominio personalizado. Railway te indicará la dirección a la que debes apuntar tu DNS.

### En Render

En el dashboard del servicio, ve a Settings → Custom Domains, agrega tu dominio y configura los registros DNS según las instrucciones proporcionadas.

## 🔒 Consideraciones de Seguridad

Es fundamental mantener la seguridad de la aplicación en producción. Nunca incluyas variables de entorno sensibles directamente en el código fuente; siempre usa el sistema de variables de entorno de tu plataforma de hosting. Asegúrate de que las conexiones a la base de datos usen SSL en producción para encriptar los datos en tránsito.

Genera un `JWT_SECRET` nuevo y completamente aleatorio para producción, diferente del que uses en desarrollo. Configura correctamente CORS en `server/_core/index.ts` para permitir solo los orígenes autorizados. Considera implementar rate limiting para proteger tus APIs de abuso.

## 📊 Monitoreo y Logs

### Vercel

Accede a los logs desde Dashboard → Deployment → Logs. Vercel también ofrece integración con Sentry para monitoreo de errores en tiempo real.

### Railway

Los logs están disponibles en Proyecto → Deployments → View Logs. Railway también proporciona métricas de CPU y memoria en tiempo real para monitorear el rendimiento.

### Render

Los logs se encuentran en Dashboard → Logs. Puedes configurar alertas por email para recibir notificaciones de errores críticos.

## 🐛 Solución de Problemas en Producción

### Error: "Cannot connect to database"

Este error indica problemas de conectividad con la base de datos. Verifica que la variable `DATABASE_URL` esté correctamente configurada con el formato adecuado. Asegúrate de que la base de datos permita conexiones externas desde la IP de tu servidor de aplicaciones. Revisa las reglas de firewall y grupos de seguridad en tu proveedor de base de datos.

### Error: "Module not found"

Este error sugiere que las dependencias no se instalaron correctamente. Ejecuta `pnpm install` en el servidor para reinstalar todas las dependencias. Verifica que `node_modules` no esté incluido en `.gitignore` si tu plataforma requiere que esté en el repositorio. Limpia la caché de build y reconstruye la aplicación.

### Error: "Port already in use"

La mayoría de las plataformas de hosting asignan el puerto automáticamente a través de la variable `process.env.PORT`. Asegúrate de que tu aplicación use `process.env.PORT || 3000` en lugar de un puerto fijo.

### Aplicación lenta o timeouts

Si la aplicación responde lentamente, verifica los recursos del servidor (CPU, memoria) en el panel de control de tu plataforma. Optimiza las queries de base de datos agregando índices donde sea necesario. Si el problema persiste, considera escalar a un plan superior con más recursos.

## 📞 Soporte

Para problemas específicos de despliegue o bugs en la aplicación, contacta a:

- **Email**: greenhproject@gmail.com
- **GitHub Issues**: https://github.com/greenhproject/solar-project-manager/issues

## 📝 Checklist de Despliegue

Antes de considerar el despliegue completo, verifica que hayas completado todos estos pasos:

- [ ] Base de datos MySQL/TiDB creada y accesible desde internet
- [ ] Todas las variables de entorno configuradas en la plataforma de hosting
- [ ] Código fuente subido a GitHub en el repositorio correcto
- [ ] Servicio web creado en la plataforma de hosting elegida
- [ ] Build completado exitosamente sin errores
- [ ] Migraciones de base de datos ejecutadas (`pnpm db:push`)
- [ ] Datos iniciales cargados (`npx tsx seed-data.mjs`)
- [ ] Usuario maestro `greenhproject@gmail.com` verificado como administrador
- [ ] Aplicación accesible desde la URL pública asignada
- [ ] Sistema de login funcional y probado
- [ ] Creación de proyectos funcional
- [ ] Carga de archivos adjuntos funcional (S3 configurado correctamente)
- [ ] Asistente de IA funcional (API key configurada)
- [ ] Dominio personalizado configurado (opcional pero recomendado)
- [ ] Sistema de monitoreo y alertas configurado

---

**¡Listo!** Siguiendo esta guía, tu aplicación Solar Project Manager debería estar completamente funcional en producción y lista para ser utilizada por el equipo de GreenH Project.
