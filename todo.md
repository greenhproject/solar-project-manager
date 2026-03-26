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


## Filtro de Proyectos por Hitos Asignados + Vista Tabla (4 Dic 2025)

- [x] Crear helper en db.ts para obtener proyectos con hitos asignados a usuario
- [x] Modificar procedimiento tRPC getProjects para filtrar según rol
- [x] Usuarios normales: solo proyectos con hitos asignados
- [x] Administradores: todos los proyectos
- [x] Cambiar vista de Dashboard de cards a tabla
- [x] Agregar columnas: Nombre, Cliente, Estado, Progreso, Ubicación, Acciones
- [x] Mantener estadísticas en cards arriba de la tabla
- [x] Probar funcionalidad completa


## Responsive Dashboard Tabla (4 Dic 2025)

- [x] Detectar tamaño de pantalla con hook useIsMobile
- [x] Mostrar cards en móviles (< 768px)
- [x] Mostrar tabla en desktop (>= 768px)
- [x] Probar en diferentes tamaños de pantalla


## Scroll Horizontal en Tabla para Tablets (4 Dic 2025)

- [x] Envolver tabla en contenedor con overflow-x-auto
- [x] Agregar min-width a tabla para forzar scroll
- [x] Probar en tablet que la tabla tenga scroll horizontal


## Corrección de Edición de Perfil (4 Dic 2025)

- [x] Investigar por qué el nombre no se guarda (Auth0 no devuelve name)
- [x] Agregar fallback para usar nickname o email si name no existe
- [x] Agregar logs para debuggear datos de Auth0
- [x] Probar que el nombre se guarde correctamente al hacer login
- [x] Probar flujo completo de edición de perfil


## Bug: Nombre se Sobrescribe con Email al Hacer Login (4 Dic 2025)

- [x] Identificar que el problema es en auth0Service.ts
- [x] El backend sobrescribe el nombre cada vez que el usuario hace login
- [x] Modificar auth0Service para NO sobrescribir nombre si ya existe
- [x] Solo actualizar nombre si viene de Auth0 Y el usuario no tiene nombre guardado
- [x] Probar que el nombre se mantenga después de editarlo


## Versión 3.0 - Módulo Trámites y Diseño (4 Dic 2025)

### Fase 1: Schema y Nuevo Rol
- [x] Agregar rol "ingeniero_tramites" al enum de roles en schema
- [x] Migrar base de datos con nuevo rol
- [x] Actualizar permisos en routers para incluir ingeniero_tramites

### Fase 2: Biblioteca de Plantillas CAD
- [x] Crear tabla cad_templates en schema (marca_inversor, potencia, operador_red, cantidad_paneles, potencia_paneles, descripcion, fileUrl, fileKey)
- [x] Crear procedimientos tRPC para CRUD de plantillas CAD
- [x] Crear página TramitesYDiseno.tsx con sección de plantillas
- [x] Implementar filtros por marca, potencia, operador, etc.
- [x] Implementar carga y descarga de archivos CAD

### Fase 3: Biblioteca de Archivos Comunes
- [x] Crear tabla common_documents en schema (tipo, marca, modelo, descripcion, fileUrl, fileKey)
- [x] Tipos: certificado_inversor, certificado_paneles, manual_inversor, matricula_constructor, matricula_disenador
- [x] Crear procedimientos tRPC para gestionar biblioteca común
- [x] Implementar UI para cargar archivos comunes con filtros

### Fase 4: Checklist de Legalización por Proyecto
- [x] Crear tabla project_legalization_checklist en schema (projectId, documentType, fileUrl, fileKey, autoLoaded, uploadedAt)
- [x] 13 tipos de documentos: certificado_tradicion, cedula_cliente, plano_agpe, autodeclaracion_retie, certificado_inversor, certificado_paneles, manual_inversor, matricula_inversor, experiencia_constructor, matricula_disenador, memoria_calculo, disponibilidad_red, otros
- [x] Crear procedimientos tRPC para checklist
- [x] Implementar sección "Trámites y Legalización" en ProjectDetail.tsx
- [x] Implementar carga automática desde biblioteca común
- [x] Implementar carga manual de archivos
### Fase 5: Descarga Masiva en ZIP
- [x] Instalar librería jszip para generar archivos ZIP
- [x] Implementar botón "Descargar Todo" en checklist
- [x] Probar descarga de archivos organizados
- [x] Agregar ruta /tramites en App.tsx
- [x] Agregar link en Sidebar para admin e ingeniero_tramitesdentro del ZIP

### Fase 6: Testing y Documentación
- [ ] Crear tests para plantillas CAD
- [ ] Crear tests para biblioteca común
- [ ] Crear tests para checklist de legalización
- [ ] Actualizar documentación del proyecto
- [ ] Guardar checkpoint versión 3.0
- [ ] Pushear a GitHub


## Fix Migración Base de Datos (4 Dic 2025)
- [x] Aplicar migración de base de datos con script SQL manual
- [x] Verificar creación de tablas: cad_templates, common_documents, project_legalization_checklist
- [x] Reiniciar servidor de desarrollo
- [x] Probar carga del módulo de Trámites sin errores
- [x] Verificar checklist de legalización en proyecto
- [x] Verificar página de Trámites y Diseño


## Fix Schema cad_templates (4 Dic 2025)
- [x] Verificar columnas de tabla SQL cad_templates
- [x] Comparar con schema Drizzle
- [x] Corregir discrepancia entre SQL y Drizzle (agregadas columnas: modeloInversor, marcaPaneles, tags)
- [x] Probar página de Trámites sin errores
- [x] Verificar tab de Plantillas CAD
- [x] Verificar tab de Documentos Comunes


## Correcciones Checklist de Legalización (4 Dic 2025)

- [x] Corregir responsive del modal "Cargar desde Biblioteca" en móviles
- [x] Cambiar "Matrícula del Inversor" por "Matrícula del Constructor" en checklist
- [x] Verificar que todos los nombres de documentos sean correctos
- [x] Probar modal en diferentes tamaños de pantalla


## Error Auth0 en Railway (4 Dic 2025)

- [x] Analizar logs de Railway: "Missing Auth0 token" y error 403
- [x] Revisar cómo TramitesYDiseno.tsx envía el token de Auth0
- [x] Verificar que useAuth0Custom esté funcionando correctamente
- [x] Corregir envío de Authorization header en requests tRPC (agregado enabled a queries)
- [x] Agregar loading state mientras Auth0 obtiene el token
- [ ] Probar autenticación en Railway después del fix


## Fix Upload a Biblioteca en Railway (4 Dic 2025)

- [x] Diagnosticar problema de timeout en Cloudinary
- [x] Sanitizar nombres de archivo (remover caracteres especiales como &)
- [x] Agregar timeout de 2 minutos para archivos grandes
- [x] Mejorar logs de error en storage.ts
- [ ] Agregar validación de tamaño de archivo en frontend (opcional)
- [ ] Probar upload con archivo PDF grande en Railway


## Fix Dropdown de Roles (4 Dic 2025)

- [x] Localizar componente de gestión de usuarios (UserManagement.tsx)
- [x] Agregar opción "Ingeniero de Trámites" al dropdown de roles
- [x] Actualizar filtro para mostrar ingeniero_tramites en sección Ingenieros
- [x] Corregir type casts en ambos dropdowns
- [ ] Probar cambio de rol en Railway


## Fix Validación Backend Rol Ingeniero Trámites (4 Dic 2025)

- [x] Buscar procedimiento users.updateRole en routers.ts (línea 286)
- [x] Actualizar schema de validación para incluir "ingeniero_tramites" (z.enum)
- [x] Actualizar tipo en db.ts updateUserRole (línea 562)
- [x] Verificar que no haya otros procedimientos con validación de rol
- [ ] Probar cambio de rol en Railway


## Fix Visualización de Rol en Sidebar (4 Dic 2025)

- [x] Identificar código que muestra badge de rol en Sidebar (línea 216)
- [x] Agregar caso para "ingeniero_tramites" con badge morado
- [x] Corregir UserProfile.tsx también (línea 649)
- [x] DashboardLayout no muestra rol, solo Sidebar y UserProfile
- [ ] Probar en Railway con Santiago Bravo


## Fix Permisos de Carga desde OpenSolar (5 Dic 2025)

- [x] Identificar procedimiento que carga datos desde OpenSolar (getProjectData línea 1548)
- [x] Verificar validación de rol (usaba adminProcedure)
- [x] Cambiar a protectedProcedure para permitir todos los usuarios autenticados
- [ ] Probar con usuario ingeniero en Railway


## Fix OAuth en Producción - Usar Auth0 en lugar de Manus (5 Dic 2025)

- [ ] Identificar variables de entorno de OAuth en el código
- [ ] Verificar qué URLs están hardcodeadas vs configurables
- [ ] Documentar variables que deben actualizarse en Railway para Auth0
- [ ] Probar login en Railway con Auth0


## Fix Permisos de Proyecto para Usuarios con Hitos Asignados (5 Dic 2025)

- [x] Identificar procedimientos que bloquean acceso (projects.getById, milestones.getByProject, projectUpdates.getByProject)
- [x] Crear función userHasAssignedMilestones() y getMilestonesByProjectIdForUser() en db.ts
- [x] Modificar projects.getById para permitir acceso a usuarios con hitos asignados
- [x] Modificar milestones.getByProject para filtrar hitos según permisos
- [x] Modificar projectUpdates.getByProject para permitir acceso a usuarios con hitos
- [ ] Probar con ingeniero_tramites en Railway


## Fix Formulario de Edición de Perfil (15 Dic 2025)

- [x] Identificar por qué el formulario se guarda automáticamente (botón dentro de form)
- [x] Agregar preventDefault y stopPropagation al botón "Editar Perfil"
- [ ] Probar edición de nombre en perfil en Railway


## Mejora Visualización del Calendario (15 Dic 2025)

- [x] Cambiar eventos a "todo el día" (all-day) en lugar de horas específicas
- [x] Configurar horario laboral de 8:00 AM a 5:00 PM (min/max en Calendar)
- [x] Vista mensual como predeterminada (ya estaba configurada)
- [x] Mejorar visualización cuando hay muchos proyectos (CSS mejorado)
- [ ] Probar con múltiples proyectos en Railway


## Fix Calendario All-Day + Filtro Búsqueda (15 Dic 2025)

- [x] Verificar que eventos all-day funcionen correctamente (agregado allDayAccessor)
- [x] Agregar filtro combobox con búsqueda por nombre de proyecto
- [x] Incluir ID de OpenSolar en el filtro para fácil ubicación
- [ ] Probar en Railway después del despliegue


## Navegación desde Tarjetas del Dashboard (28 Ene 2026)

- [x] Hacer tarjetas de estadísticas clickeables en Dashboard
- [x] Navegar a vista filtrada de proyectos según tarjeta clickeada
- [x] Ordenar proyectos "Con Retraso" del más retrasado al menos
- [x] Mostrar días de retraso en la vista filtrada
- [x] Agregar botón para volver al dashboard
- [ ] Probar funcionalidad completa


## Corrección flujo Auth0 completo (28 Feb 2026)

- [x] Revisar flujo actual de autenticación (frontend y backend)
- [x] Corregir login para usar Auth0 exclusivamente (no Manus OAuth)
- [x] Corregir logout para cerrar sesión en Auth0 y redirigir al home
- [x] Corregir registro para redirigir a Auth0 signup
- [x] Home.tsx usa Auth0 para login/registro cuando está configurado
- [x] Corregir sesión expirada - MainLayout muestra botón de re-autenticación
- [x] Sidebar usa datos reales del backend (meQuery) para rol correcto
- [x] main.tsx no redirige a Manus OAuth en error 401
- [x] Push a GitHub para Railway (commit c9bf30f)


## Fix Dashboard usuarios no-admin (28 Feb 2026)

- [x] Corregir menú lateral para ingeniero_tramites (ya tenía Dashboard, Proyectos, Calendario, etc. en Sidebar.tsx)
- [x] Corregir métricas del dashboard que muestran 0 para usuarios no-admin (stats ahora combina proyectos por hitos asignados + asignación directa)
- [x] Corregir milestones.getAll para incluir proyectos por hitos asignados (no solo assignedEngineerId)
- [x] Corregir milestones.overdue para incluir proyectos por hitos asignados
- [x] Corregir milestones.getByProject para que ingeniero_tramites vea todos los hitos del proyecto
- [x] Agregar notificaciones en menú lateral para usuarios no-admin (NotificationBell ya estaba para todos los autenticados)
- [x] Verificar que todos los roles tengan acceso a las funciones básicas (tests creados en ingeniero-tramites.test.ts)
- [x] Push a GitHub para Railway (commit 69fbcf2)


## Fix Sidebar y Overdue para ingeniero_tramites en Railway (28 Feb 2026)

- [x] Corregir Sidebar: solo muestra "Trámites y Diseño" para ingeniero_tramites, faltan Dashboard, Proyectos, Calendario, Recordatorios, Notificaciones, Asistente IA, Análisis
- [x] Corregir NotificationBell: campana ya estaba funcional para todos los autenticados
- [x] Corregir "Con Retraso" muestra 0 - ahora calcula overdue por hitos vencidos además de fecha del proyecto
- [x] Push a GitHub para Railway (commit bfcb7d7)


## Fix Filtro Overdue en Página de Proyectos (28 Feb 2026)

- [x] El filtro "overdue" en Projects.tsx solo compara estimatedEndDate, no hitos vencidos
- [x] Agregar flag hasOverdueMilestones al listado de proyectos desde el backend
- [x] Actualizar filtro en frontend para usar el nuevo flag
- [x] Push a GitHub para Railway (commit aebf068)


## Fix Hitos: ingeniero_tramites ve todos los hitos en vez de solo los asignados (28 Feb 2026)

- [x] Revertir milestones.getByProject para que ingeniero_tramites solo vea sus hitos asignados (no todos los del proyecto)
- [x] Push a GitHub para Railway (commit 6d124ca)


## Fix Recordatorios para ingeniero_tramites (1 Mar 2026)

- [x] Backend: filtrar milestones.overdue y reminders.overdue/upcoming para que ingeniero_tramites solo vea hitos donde es responsable (assignedUserId)
- [x] Frontend: agregar enlace directo al proyecto al hacer clic en cada recordatorio
- [x] Frontend: permitir reprogramar fecha del hito con justificación obligatoria (queda como nota en project_updates)
- [x] Ordenar por días de vencimiento (más urgente primero) - ya estaba ordenado por dueDate ASC
- [x] Push a GitHub para Railway (commit eab9a7c)


## Módulo de Notificaciones funcional (1 Mar 2026)

- [x] Backend: crear procedimiento para generar notificaciones automáticas por hitos próximos a vencer y vencidos
- [ ] Backend: crear tabla email_config para configuración dinámica de proveedor - [x] Backend: crear tabla email_config para configuración dinámica de proveedor de email desde admin
- [x] Backend: actualizar emailService.ts para usar configuración dinámica (Resend, SendGrid, SMTP genérico)
- [x] Backend: integrar envío de email con copia al admin configurable para trazabilidad
- [x] Frontend: auto-generar notificaciones al cargar la página (todos los roles)
- [x] Frontend: crear página de Configuración de Email en admin (/settings/email)
- [x] Push a GitHub para Railway (commit 537c67e)


## Corregir nombre de la empresa (1 Mar 2026)

- [x] Reemplazar "GreenH Project" por "Green House Project" en toda la interfaz y templates de email (8 archivos corregidos)
- [x] Push a GitHub para Railway (commit 02a1c3c)


## Fix lógica Con Retraso para usuarios no-admin (1 Mar 2026)

- [x] stats.overdue: filtra overdueMilestones por assignedUserId del usuario actual antes de contar
- [x] hasOverdueMilestones en projects.list: filtra por usuario actual para roles no-admin, admin ve todo
- [x] Push a GitHub para Railway (commit 3306eca)


## Fix vista detalle proyecto: hitos visibles para usuarios no-admin (1 Mar 2026)

- [x] milestones.getByProject: solo admin ve todos los hitos, engineer e ingeniero_tramites solo ven sus hitos asignados
- [x] milestones.getAll: filtrar por assignedUserId para no-admin
- [x] milestones.overdue: filtrar por assignedUserId para no-admin
- [x] reminders.overdue y upcoming: filtrar por assignedUserId para no-admin
- [x] stats.overdue: solo contar por hitos vencidos del usuario (no por assignedEngineerId)
- [x] projects.list hasOverdueMilestones: ya estaba correcto para no-admin
- [x] Push a GitHub para Railway (commit 032911d)


## Bug: NotFoundError removeChild al navegar entre páginas (1 Mar 2026)

- [x] Investigar causa del error "Failed to execute 'removeChild' on 'Node'" al navegar
- [x] Corregir el error en el código
- [x] Push a GitHub para Railway (commit 0b98ce3)


## Bug: NotFoundError removeChild persiste en producción (3 Mar 2026)

- [x] Investigar causa profunda: Google Translate modifica el DOM y React pierde track de nodos
- [x] Verificar que commit anterior fue desplegado en Railway (confirmado: 0b98ce3)
- [x] Aplicar monkey-patch de Node.removeChild y Node.insertBefore (solución oficial React #11538)
- [x] Mover script Umami de body a head para evitar conflictos con React DOM
- [x] Actualizar ErrorBoundary con auto-recuperación para errores de traducción
- [x] Push a GitHub para Railway (commit 6979a61)


## Fix Zona Horaria - Configuración desde Admin (4 Mar 2026)

### Backend
- [x] Agregar tabla app_settings en schema para configuración global (timezone, etc.)
- [x] Crear helper server/timezone.ts con getNowInConfiguredTimezone() y cache de 5 min
- [x] Actualizar db.ts: getOverdueMilestones, getUpcomingMilestones, getDelayedProjects, getProjectStats
- [x] Actualizar routers.ts: completedDate, reschedule, milestone assignment email
- [x] Actualizar emailService.ts: todas las fechas en emails usan timezone configurada
- [x] Crear router appSettings.getTimezone y appSettings.setTimezone (admin only)

### Frontend
- [x] Crear componente TimezoneSettings con reloj en tiempo real y selector
- [x] Dropdown con 20 zonas horarias LATAM + internacionales
- [x] Crear hook useTimezone con formatDate, formatDateTime, formatRelative
- [x] Actualizar 10 páginas: Dashboard, Projects, ProjectDetail, Reminders, GanttChart, AdvancedAnalytics, NotificationHistory, EmailConfig, UserProfile, UserManagement
- [x] Sección de Zona Horaria integrada en Settings de admin

### Despliegue
- [x] Push a GitHub para Railway (commit 0a981cb)


## Fix: Zona Horaria no aparece en Settings de producción (4 Mar 2026)

- [x] Verificar que el commit de timezone fue desplegado - errores TS impedían build en Railway
- [x] Verificar que Settings.tsx incluye el componente TimezoneSettings (confirmado OK)
- [x] Corregir errores TS: import getDb, tipos null, ts-expect-error, ctx.user.email nullable
- [x] Push corrección a GitHub (commit a447b3a)

## Feature: Responsable por defecto en plantillas de hitos (4 Mar 2026)

- [x] Agregar campo defaultAssignedUserId a tabla milestone_templates en schema
- [x] Actualizar procedimientos tRPC create/update de plantillas para incluir responsable
- [x] Agregar selector de responsable en UI de plantillas de hitos (SystemConfiguration.tsx)
- [x] Al usar plantilla, precargar el responsable asignado en el hito (2 ubicaciones en routers.ts)
- [x] Mostrar responsable asignado en lista de plantillas con icono de usuario
- [x] Push a GitHub para Railway (commit a447b3a)


## Fix: Responsive pésimo en móvil + Dashboard muestra 0 retrasos (4 Mar 2026)

### Responsive
- [x] MainLayout: padding top para hamburger menu en móvil (pt-14)
- [x] Dashboard: grid-cols-2 en móvil, tamaños de texto responsivos
- [x] Projects: card headers, iconos y texto más pequeños en móvil
- [x] Reminders: layout responsivo corregido
- [x] 13 páginas: text sizes responsivos (text-xl sm:text-2xl lg:text-3xl)
- [x] 13 páginas: container padding responsivo (py-4 sm:py-6 lg:py-8)

### Dashboard vs Proyectos - Conteo de retrasos
- [x] Causa: getProjectStats solo comparaba estimatedEndDate, no hitos vencidos
- [x] Fix: getProjectStats ahora cuenta overdue = fecha vencida OR hitos vencidos
- [x] Admin ve panorama global correcto
- [x] Push a GitHub para Railway (commit e4d3ebd)


## Feature: Admin puede eliminar hitos de un proyecto (9 Mar 2026)

- [x] Backend: crear procedimiento tRPC milestones.delete (solo admin)
- [x] Backend: eliminar datos relacionados (reminders, project_updates del hito) antes de borrar el hito
- [x] Frontend: agregar botón de eliminar hito en ProjectDetail con confirmación
- [x] Frontend: diálogo de confirmación con nombre del hito antes de eliminar
- [x] Tests: crear test para verificar que admin puede eliminar y no-admin no puede
- [x] Push a GitHub para Railway (commit ef26c8a)

## Fix: Deploy Railway falla por drizzle-kit push interactivo (10 Mar 2026)
- [x] Diagnosticar: drizzle-kit push pregunta si app_settings es nueva o rename de company_settings
- [x] Crear script scripts/migrate-production.mjs para migraciones no-interactivas
- [x] Actualizar railway.json para usar migrate-production.mjs en vez de db:push
- [x] Actualizar nixpacks.toml para usar migrate-production.mjs
- [x] Push a GitHub para Railway (commit 81b0f04)

## Bug: Railway ignora railway.json buildCommand (10 Mar 2026)
- [ ] Investigar: Railway usa config del servicio en vez de railway.json
- [ ] Solución: Railway tiene buildCommand configurado en el servicio que sobreescribe railway.json
- [ ] Alternativa: Modificar nixpacks.toml que es lo que Railway realmente usa

## Feature: Google Calendar URL scheme - sincronizar hitos al calendar personal del usuario (10 Mar 2026)
- [x] Frontend: Reemplazar llamada tRPC syncToCalendar por apertura de URL de Google Calendar
- [x] Frontend: Generar URL con datos del hito (título, descripción, fecha, ubicación)
- [x] Frontend: Abrir en nueva pestaña para que el usuario confirme en su Google Calendar


## Feature: Webhook OpenSolar - Solo Proyectos Vendidos (10 Mar 2026)
- [x] Backend: Crear endpoint POST /api/webhook/opensolar en Express
- [x] Backend: Validar header X-Webhook-Secret para seguridad
- [x] Backend: Detectar evento "Project Marked as Sold" (event_type 103 o sold_date) → crear proyecto en Solar Manager
- [x] Backend: Procesar UPDATE solo si el proyecto ya existe (ya vendido) en Solar Manager
- [x] Backend: Crear tabla webhook_logs para historial de webhooks recibidos
- [x] Backend: Registrar cada webhook recibido en webhook_logs
- [x] Frontend: Mostrar logs de webhooks en Configuración con componente WebhookLogs
- [x] Tests: 8 tests pasaron (funciones DB + handler)
- [x] Config: OPENSOLAR_WEBHOOK_SECRET en env.ts (default: greenhproject-2025)
- [x] Push a GitHub para Railway (commit 9fbe27a)

## Bug: Ingenieros no pueden subir archivos en carpeta del proyecto (11 Mar 2026)
- [x] Investigar endpoint de subida de archivos y permisos por rol
- [x] Corregir permisos para que ingenieros e ingenieros de trámites puedan subir archivos
- [x] Verificar y hacer push a GitHub (commit 4628472)

## Bug: Barra de progreso no se llena visualmente (11 Mar 2026)
- [x] Investigar componente Progress/barra de progreso en tarjetas de proyecto
- [x] Corregir para que el ancho de la barra refleje el porcentaje (inline gradient en Dashboard, Projects, Progress component)
- [x] Push a GitHub (commit 311d176)

## Bug: Desfase de un día al seleccionar fecha de hito (26 Mar 2026)
- [x] Investigar cómo se manejan las fechas al seleccionar en el DatePicker de hitos
- [x] Corregir el desfase de timezone que causa que la fecha se muestre un día después
- [x] Crear funciones utilitarias fromDateInputValue() y toLocalDateString() en useTimezone.ts
- [x] Aplicar corrección en ProjectDetail.tsx (crear hito + editar fecha)
- [x] Aplicar corrección en NewProject.tsx (crear proyecto)
- [x] Aplicar corrección en Reminders.tsx (reprogramar hito)
- [x] Aplicar corrección en EditProject.tsx (mostrar fechas de proyecto)
- [x] 16 tests pasando (date-utils.test.ts)
- [ ] Verificar la corrección en el navegador
- [ ] Push a GitHub
