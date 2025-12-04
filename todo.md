# Solar Project Manager - Lista de Tareas

## Integración Google Calendar para Railway (30 Nov 2025)

- [x] Instalar googleapis package para acceso directo a Google Calendar API
- [x] Crear detección de entorno (Manus vs Railway)
- [x] Implementar cliente de Google Calendar con Service Account para Railway
- [x] Mantener integración MCP para Manus
- [x] Actualizar funciones createCalendarEvent, updateCalendarEvent, deleteCalendarEvent
- [x] Agregar botón manual de sincronización en frontend
- [x] Mejorar indicadores visuales de sincronización
- [x] Documentar configuración de Service Account en Railway (GOOGLE_CALENDAR_SETUP.md)
- [x] Crear procedimiento tRPC syncToCalendar
- [ ] Configurar GOOGLE_CALENDAR_CREDENTIALS en Railway
- [ ] Probar sincronización en desarrollo
- [ ] Verificar que funcione en Railway

## Corrección Error de Logout OAuth (30 Nov 2025)

- [x] Investigar código de logout en useAuth.ts
- [x] Agregar redirección explícita a login después de logout
- [x] Limpiar localStorage completo (auth_token + manus-runtime-user-info)
- [x] Mejorar manejo de errores en logout
- [ ] Probar logout en producción (Railway)


## Notificaciones por Email con Resend (30 Nov 2025)

- [x] Instalar resend SDK
- [x] Identificar todos los tipos de notificaciones en el sistema
- [x] Crear servicio de email (emailService.ts)
- [x] Crear plantillas HTML para emails
- [x] Integrar envío de email en hitos próximos a vencer
- [x] Integrar envío de email en hitos vencidos
- [x] Integrar envío de email en proyectos completados
- [x] Integrar envío de email en asignación de proyectos
- [ ] Configurar RESEND_FROM_EMAIL en Railway (email verificado)
- [ ] Probar envío de emails en desarrollo
- [ ] Verificar que funcione en Railway


## Código HTML para Embeber en Wix (30 Nov 2025)

- [x] Crear código HTML de iframe optimizado para Wix (wix-embed.html)
- [x] Crear instrucciones paso a paso para integración en Wix (WIX_INTEGRATION_GUIDE.md)
- [x] Documentar configuración de CORS si es necesario
- [x] Crear versión responsive del iframe


## Asignación de Responsables a Hitos (30 Nov 2025)

- [x] Investigar API de OpenSolar para obtener acciones/tareas (actions)
- [x] Verificar si OpenSolar API devuelve responsables y fechas de vencimiento (NO disponible en API)
- [x] Actualizar schema: agregar campo assignedUserId a milestones
- [x] Agregar campo jobTitle a tabla users
- [x] Crear procedimiento tRPC para asignar responsable a hito
- [x] Crear procedimiento tRPC para editar fecha de vencimiento
- [x] Crear dropdown de usuarios en cada hito (UI)
- [x] Permitir editar fecha de vencimiento en cada hito (UI)
- [ ] Agregar filtros por responsable en vista de proyectos
- [x] Notificar por email al responsable cuando se le asigna un hito (ya implementado en backend)
- [x] Probar funcionalidad completa


## Corrección de Error en Select de Responsables (3 Dic 2025)

- [x] Cambiar valor vacío "" por "none" en SelectItem de responsables
- [x] Actualizar lógica de onValueChange para manejar "none" como null
- [x] Probar que funcione correctamente


## Mejoras de Funcionalidad (3 Dic 2025)

### 1. Cargar desde OpenSolar para todos los roles
- [x] Remover restricción de rol admin en botón "Cargar desde OpenSolar"
- [x] Actualizar procedimiento tRPC para permitir acceso a todos los roles
- [x] Probar que ingenieros puedan cargar proyectos desde OpenSolar

### 2. Campo de observaciones en hitos
- [x] Agregar campo "observations" a tabla milestones en schema
- [x] Aplicar migración de base de datos
- [x] Actualizar procedimiento tRPC update para incluir observaciones
- [x] Agregar textarea de observaciones en UI de cada hito
- [x] Probar funcionalidad de observaciones

### 3. Login con popup para iframe de Wix
- [x] Detectar si la app está en iframe (isInIframe)
- [x] Implementar login con popup window para Auth0 (openLoginPopup)
- [x] Manejar comunicación entre popup y iframe (polling)
- [x] Cerrar popup automáticamente después de login exitoso
- [x] Actualizar estado de autenticación en iframe (reload)
- [x] Actualizar DashboardLayout y Home para usar handleLogin
- [ ] Probar en entorno de Wix
