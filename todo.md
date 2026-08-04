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
- [x] Configurar GOOGLE_CALENDAR_CREDENTIALS en Railway (N/A - reemplazado por Google Calendar URL scheme)
- [x] Probar sincronización en desarrollo (N/A - reemplazado por URL scheme)
- [x] Verificar que funcione en Railway (N/A - reemplazado por URL scheme)

## Corrección Error de Logout OAuth (30 Nov 2025)

- [x] Investigar código de logout en useAuth.ts
- [x] Agregar redirección explícita a login después de logout
- [x] Limpiar localStorage completo (auth_token + manus-runtime-user-info)
- [x] Mejorar manejo de errores en logout
- [x] Probar logout en producción (Railway) - funcional desde commit c9bf30f


## Notificaciones por Email con Resend (30 Nov 2025)

- [x] Instalar resend SDK
- [x] Identificar todos los tipos de notificaciones en el sistema
- [x] Crear servicio de email (emailService.ts)
- [x] Crear plantillas HTML para emails
- [x] Integrar envío de email en hitos próximos a vencer
- [x] Integrar envío de email en hitos vencidos
- [x] Integrar envío de email en proyectos completados
- [x] Integrar envío de email en asignación de proyectos
- [x] Configurar RESEND_FROM_EMAIL en Railway (email verificado) - admin@greenhproject.com configurado
- [x] Probar envío de emails en desarrollo (funcional)
- [x] Verificar que funcione en Railway (funcional)


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
- [x] Agregar filtros por responsable en vista de proyectos (implementado en AdvancedAnalytics)
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
- [x] Probar en entorno de Wix (funcional en producción)


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
- [x] Crear tests para plantillas CAD (tramites-v3.test.ts - 46 tests)
- [x] Crear tests para biblioteca común (tramites-v3.test.ts - 46 tests)
- [x] Crear tests para checklist de legalización (tramites-v3.test.ts - 46 tests)
- [x] Actualizar documentación del proyecto (README, API docs actualizados)
- [x] Guardar checkpoint versión 3.0 (incluido en checkpoints posteriores)
- [x] Pushear a GitHub (incluido en 66c3e88)


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
- [x] Probar autenticación en Railway después del fix (funcional en producción)


## Fix Upload a Biblioteca en Railway (4 Dic 2025)

- [x] Diagnosticar problema de timeout en Cloudinary
- [x] Sanitizar nombres de archivo (remover caracteres especiales como &)
- [x] Agregar timeout de 2 minutos para archivos grandes
- [x] Mejorar logs de error en storage.ts
- [x] Agregar validación de tamaño de archivo en frontend (16MB limit implementado)
- [x] Probar upload con archivo PDF grande en Railway (funcional)


## Fix Dropdown de Roles (4 Dic 2025)

- [x] Localizar componente de gestión de usuarios (UserManagement.tsx)
- [x] Agregar opción "Ingeniero de Trámites" al dropdown de roles
- [x] Actualizar filtro para mostrar ingeniero_tramites en sección Ingenieros
- [x] Corregir type casts en ambos dropdowns
- [x] Probar cambio de rol en Railway (funcional desde commit 1cda3e7)


## Fix Validación Backend Rol Ingeniero Trámites (4 Dic 2025)

- [x] Buscar procedimiento users.updateRole en routers.ts (línea 286)
- [x] Actualizar schema de validación para incluir "ingeniero_tramites" (z.enum)
- [x] Actualizar tipo en db.ts updateUserRole (línea 562)
- [x] Verificar que no haya otros procedimientos con validación de rol
- [x] Probar cambio de rol en Railway (funcional)


## Fix Visualización de Rol en Sidebar (4 Dic 2025)

- [x] Identificar código que muestra badge de rol en Sidebar (línea 216)
- [x] Agregar caso para "ingeniero_tramites" con badge morado
- [x] Corregir UserProfile.tsx también (línea 649)
- [x] DashboardLayout no muestra rol, solo Sidebar y UserProfile
- [x] Probar en Railway con Santiago Bravo (funcional - roles visibles en producción)


## Fix Permisos de Carga desde OpenSolar (5 Dic 2025)

- [x] Identificar procedimiento que carga datos desde OpenSolar (getProjectData línea 1548)
- [x] Verificar validación de rol (usaba adminProcedure)
- [x] Cambiar a protectedProcedure para permitir todos los usuarios autenticados
- [x] Probar con usuario ingeniero en Railway (funcional en producción)


## Fix OAuth en Producción - Usar Auth0 en lugar de Manus (5 Dic 2025)

- [x] Identificar variables de entorno de OAuth en el código (Auth0 configurado)
- [x] Verificar qué URLs están hardcodeadas vs configurables (todas configurables via env)
- [x] Documentar variables que deben actualizarse en Railway para Auth0 (configurado en Railway)
- [x] Probar login en Railway con Auth0 (funcional desde Feb 2026)


## Fix Permisos de Proyecto para Usuarios con Hitos Asignados (5 Dic 2025)

- [x] Identificar procedimientos que bloquean acceso (projects.getById, milestones.getByProject, projectUpdates.getByProject)
- [x] Crear función userHasAssignedMilestones() y getMilestonesByProjectIdForUser() en db.ts
- [x] Modificar projects.getById para permitir acceso a usuarios con hitos asignados
- [x] Modificar milestones.getByProject para filtrar hitos según permisos
- [x] Modificar projectUpdates.getByProject para permitir acceso a usuarios con hitos
- [x] Probar con ingeniero_tramites en Railway (funcional en producción)


## Fix Formulario de Edición de Perfil (15 Dic 2025)

- [x] Identificar por qué el formulario se guarda automáticamente (botón dentro de form)
- [x] Agregar preventDefault y stopPropagation al botón "Editar Perfil"
- [x] Probar edición de nombre en perfil en Railway (funcional)


## Mejora Visualización del Calendario (15 Dic 2025)

- [x] Cambiar eventos a "todo el día" (all-day) en lugar de horas específicas
- [x] Configurar horario laboral de 8:00 AM a 5:00 PM (min/max en Calendar)
- [x] Vista mensual como predeterminada (ya estaba configurada)
- [x] Mejorar visualización cuando hay muchos proyectos (CSS mejorado)
- [x] Probar con múltiples proyectos en Railway (funcional)


## Fix Calendario All-Day + Filtro Búsqueda (15 Dic 2025)

- [x] Verificar que eventos all-day funcionen correctamente (agregado allDayAccessor)
- [x] Agregar filtro combobox con búsqueda por nombre de proyecto
- [x] Incluir ID de OpenSolar en el filtro para fácil ubicación
- [x] Probar en Railway después del despliegue (funcional)


## Navegación desde Tarjetas del Dashboard (28 Ene 2026)

- [x] Hacer tarjetas de estadísticas clickeables en Dashboard
- [x] Navegar a vista filtrada de proyectos según tarjeta clickeada
- [x] Ordenar proyectos "Con Retraso" del más retrasado al menos
- [x] Mostrar días de retraso en la vista filtrada
- [x] Agregar botón para volver al dashboard
- [x] Probar funcionalidad completa (funcional en producción)


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
- [x] Backend: crear tabla email_config para configuración dinámica de proveedor de email desde admin
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
- [x] Investigar: Railway usa config del servicio en vez de railway.json (confirmado)
- [x] Solución: Railway tiene buildCommand configurado en el servicio que sobreescribe railway.json
- [x] Alternativa: Modificar nixpacks.toml que es lo que Railway realmente usa (implementado)

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
- [x] Verificar la corrección en el navegador (verificado)
- [x] Push a GitHub (incluido en commits posteriores, ya en 66c3e88)

## Mejora: Cascada automática de fechas al actualizar un hito (09 Abr 2026)
- [x] Investigar esquema de plantillas (milestoneTemplates) y duración en días
- [x] Implementar lógica de cascada en el servidor: al cambiar fecha de un hito, recalcular fechas de hitos siguientes
- [x] Usar los días de duración de la plantilla para calcular las nuevas fechas
- [x] Agregar diálogo de confirmación antes de aplicar cascada automática de fechas
- [x] Dar opción al usuario: "Solo este hito" vs "Recalcular todos los siguientes"
- [x] Actualizar frontend para reflejar la cascada y dar feedback al usuario
- [x] 23 tests pasando (cascade-dates.test.ts + date-utils.test.ts)
- [x] Verificar en el navegador
- [x] Push a GitHub (commit 7d456b7b)

## Mejora: Drag & Drop para reordenar hitos en plantillas Y en proyectos (09 Abr 2026)
- [x] Investigar la UI actual de plantillas de hitos (Settings) y hitos de proyecto (ProjectDetail)
- [x] Instalar librería de drag & drop (@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities)
- [x] Crear componente reutilizable SortableList.tsx con drag & drop
- [x] Implementar endpoint de reordenamiento de plantillas (reorderMilestoneTemplates)
- [x] Implementar endpoint de reordenamiento de hitos de proyecto (reorderMilestones)
- [x] Integrar drag & drop en plantillas de hitos (Settings/SystemConfiguration)
- [x] Integrar drag & drop en hitos dentro de cada proyecto (ProjectDetail)
- [x] 10 tests pasando (reorder.test.ts)
- [x] Verificar funcionalidad en el navegador
- [x] Push a GitHub para Railway (commit fdd5811)

## Fix: Errores de TypeScript y push a GitHub (09 Abr 2026)
- [x] Corregir errores TS en AIAssistant.tsx (Property 'map' does not exist on type 'never')
- [x] Corregir errores TS en NotificationHistory.tsx (Property 'created' does not exist + notificationId)
- [x] Corregir error TS en emailService.ts (instalar nodemailer + @types/nodemailer)
- [x] Corregir errores TS en notificationGenerator.ts (usar sendMilestoneReminderEmail con params correctos)
- [x] Verificar compilación limpia (0 errores TS)
- [x] Push a GitHub para Railway con drag & drop + TS fixes (commit 9c4c256)

## Mejora: Sistema de Documentos Dinámicos tipo DocuSign (09 Abr 2026)
- [x] Investigar código actual de Trámites y Diseño + Trámites y Legalización
- [x] Diseñar tablas BD: dynamicDocTemplates (plantillas), dynamicDocFields (campos configurables), generatedDynamicDocs
- [x] Crear migración de BD con script SQL directo
- [x] Implementar endpoints servidor: CRUD plantillas dinámicas + campos + generación
- [x] Implementar endpoint de generación de documento (reemplazar campos en Word con docx-templates)
- [x] Agregar pestaña "Docs Dinámicos" en sección Trámites y Diseño (3 pestañas)
- [x] UI para subir plantilla Word y configurar campos dinámicos (FieldEditorDialog)
- [x] UI para configurar tipo de campo (texto, número, fecha, selección, auto-proyecto)
- [x] Integrar en Trámites y Legalización: sección "Documentos Dinámicos" con botón Generar
- [x] UI para llenar campos dinámicos con auto-fill de datos del proyecto y descargar documento
- [x] 17 tests pasando (dynamic-docs.test.ts)
- [x] 0 errores TypeScript
- [x] Push a GitHub para Railway (commit e972723)

## Fix: Responsive pestañas Trámites y Diseño (09 Abr 2026)
- [x] Corregir pestañas superpuestas en móvil (flex + overflow-x-auto + text-xs/truncate)
- [x] Corregir headers de cards para responsive (flex-col en móvil, flex-row en desktop)
- [x] Push a GitHub (commit c8b5be4)

## Fix: Error INSERT dynamic_doc_templates (09 Abr 2026)
- [x] Investigar error: espacios en fileKey de S3 causaban problemas
- [x] Sanitizar fileKey reemplazando espacios por guiones bajos
- [x] Agregar mejor manejo de errores con try/catch y mensajes claros
- [x] Verificar subida exitosa en entorno de desarrollo
- [x] Push a GitHub (commit cf8cc8f)

## Fix: Error 500 al subir plantilla dinámica en producción (09 Abr 2026)
- [x] Investigar mismatch entre schema Drizzle y tabla real en BD producción
- [x] Causa raíz: tablas dynamic_doc_* no existían en BD de producción (migración manual nunca se ejecutó en Railway)
- [x] Solución: agregar CREATE TABLE IF NOT EXISTS para las 3 tablas dinámicas en runAutoMigrations() de server/_core/index.ts
- [x] Verificar INSERT con Drizzle ORM funciona correctamente en desarrollo
- [x] TypeScript compila sin errores
- [x] Push a GitHub (commit a836fa1) y verificar en producción

## Feature: Editor Visual de Campos Dinámicos (09 Abr 2026)
- [x] Backend: endpoint parseDocument para extraer HTML del Word con mammoth y detectar marcadores {{...}}
- [x] Frontend: visor visual del documento con marcadores resaltados (verde=configurado, rojo=sin configurar, naranja=seleccionado)
- [x] Frontend: panel lateral con tarjetas expandibles para configurar cada campo (tipo, etiqueta, requerido, mapeo, valor por defecto)
- [x] Integrar el editor visual con el botón "Campos" existente (reemplaza FieldEditorDialog por VisualFieldEditor)
- [x] Auto-detectar marcadores al abrir editor y crear campos automáticamente
- [x] Tests unitarios para parseDocument (3 tests pasando)
- [x] Push a GitHub (commit 33a469d)

## Fix: Botón 'Ver' descarga en lugar de mostrar vista previa (09 Abr 2026)
- [x] Cambiar botón 'Ver/Versión' para abrir modal de vista previa del documento Word dentro de la app
- [x] Corregir etiqueta del botón (aparece como 'Versión' en producción, debería ser 'Ver')
- [x] Mostrar contenido renderizado del Word con marcadores resaltados en el modal
- [x] Componente DocumentPreviewDialog creado con vista tipo "papel" y marcadores en naranja
- [x] Push a GitHub (commit db9fb68)

## Fix: Responsive del Editor Visual de Campos (09 Abr 2026)
- [x] El texto del documento se corta - corregido con word-break y overflow-wrap
- [x] Los controles del header se superponen - rediseñado con layout compacto y truncate
- [x] El layout de vista dividida no se adapta - reemplazado por tabs (Documento/Campos)
- [x] Los campos muestran "No encontrado" - era correcto, los campos del test sí están en el documento
- [x] Mejorar el layout general - dialog fullscreen con tabs, footer fijo, scroll independiente
- [x] DocumentPreviewDialog también mejorado con responsive
- [x] Push a GitHub (commit f239da5)

## Fix: Responsive del Editor Visual SIGUE MAL en producción (09 Abr 2026)
- [x] Vista dividida eliminada - reescrito como custom modal con tabs exclusivos
- [x] Texto del documento se muestra completo con word-break y overflow-wrap
- [x] Scroll funciona correctamente - overflow-y-auto en body, header/footer fijos
- [x] Header compacto con badge y X sin superposición
- [x] Reescrito completamente sin DialogContent de shadcn (custom fixed modal)
- [x] Push a GitHub (commit cde1650)

## Mejora: Checklist de Legalización + Docs Dinámicos (09 Abr 2026)
- [x] Backend: endpoint legalizationChecklist.delete ya existía
- [x] Frontend: botón de eliminar (papelera) en cada item del checklist (group-hover)
- [x] Confirmación antes de eliminar un item (window.confirm)
- [x] Frontend: sección de Documentos Dinámicos muestra docs generados con badge verde, botones ver/descargar/eliminar
- [x] Frontend: al generar documento, se invalida la query y aparece inmediatamente en la sección
- [x] Push a GitHub (commit ece5ec1)

## Mejora: Conversión automática Word a PDF al generar documento dinámico (09 Abr 2026)
- [x] Instalar libreoffice-convert para conversión docx a PDF
- [x] Modificar endpoint generateDocument para convertir el .docx generado a .pdf con LibreOffice
- [x] Guardar el PDF en S3 en lugar del Word (con fallback a Word si LibreOffice no disponible)
- [x] Actualizar nixpacks.toml con libreoffice-still para producción
- [x] Push a GitHub (commit 74567be)

## Mejora: Rediseño completo de la sección Calendario (09 Abr 2026)
- [x] Eliminar la lista caótica de badges de proyectos - reemplazada por dropdown de filtro compacto
- [x] Rediseñar el calendario con interfaz moderna, limpia y profesional
- [x] Mejorar la visualización de eventos con bordes de color por proyecto y hover effects
- [x] Filtro de proyectos como dropdown elegante con checkboxes de color y conteo de hitos
- [x] Efectos profesionales: transiciones CSS, hover en celdas, slide-in del panel lateral
- [x] Vista de día con horario de trabajo 8:00-17:00
- [x] Panel lateral con detalle del evento: estado, fecha, proyecto, botón "Ver proyecto"
- [x] Panel mobile como bottom sheet para pantallas pequeñas
- [x] Mini-stats en header: total hitos, completados, pendientes, hoy
- [x] CSS completamente reescrito con variables CSS para dark/light mode
- [x] Push a GitHub (commit 295881c)

## Mejora: Subir cualquier tipo de archivo en archivos del proyecto (13 Abr 2026)
- [x] FileUpload.tsx ya acepta cualquier tipo de archivo (sin restricción accept)
- [x] LegalizationChecklist.tsx: eliminada restricción accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
- [x] Backend ya aceptaba cualquier mimeType (sin cambios necesarios)
- [x] FileUpload.tsx ya muestra icono apropiado según tipo de archivo (PDF, Word, Excel, imagen, ZIP, CAD, etc.)
- [x] Push a GitHub (commit 8b65188)

## Mejora: Ordenamiento y vistas múltiples en lista de proyectos (13 Abr 2026)
- [x] Toolbar compacta con dropdown de filtro por estado, dropdown de ordenamiento (9 opciones), y toggle de vista
- [x] Opciones de ordenamiento: más recientes, más antiguos, última actualización, fecha inicio, mayor/menor progreso, nombre A-Z/Z-A, cliente, estado agrupado
- [x] Vista tarjetas: rediseñada con barra de color por estado, layout 4 columnas en XL, fechas inicio/fin
- [x] Vista tabla: columnas proyecto, cliente, ubicación, estado, progreso, inicio, fin estimado; filas clickeables
- [x] Vista Kanban: 5 columnas por estado (Planificación, En Progreso, En Espera, Completado, Cancelado) con scroll horizontal y conteo
- [x] Status badges rediseñados con dot indicator y colores por estado
- [x] Push a GitHub (commit 8b65188)

## Mejora: Sistema de comentarios con trazabilidad en observaciones de hitos (13 Abr 2026)
- [x] Crear tabla milestone_comments en schema (milestoneId, userId, content, createdAt)
- [x] Migrar base de datos con nueva tabla (SQL directo)
- [x] Crear procedimientos tRPC: milestoneComments.list, milestoneComments.add, milestoneComments.delete
- [x] Reemplazar textarea simple por hilo de comentarios con nombre de usuario, rol y fecha/hora
- [x] Campo observations existente mantenido como legacy (no se eliminaron datos)
- [x] Tests escritos y pasando (milestoneComments.test.ts - 8 tests)
- [x] Push a GitHub (commit 1ea6c55)

## Bug: Error al insertar comentario en milestone_comments en producción (13 Abr 2026)
- [x] Diagnosticar error: tabla milestone_comments no existe en BD de producción (Railway)
- [x] Agregar auto-migración en el arranque del servidor para crear la tabla si no existe
- [x] Push a GitHub (commit a613570) - Railway desplegará y creará la tabla automáticamente

## Mejora: Diagrama de Gantt - Visualización, descarga y reporte (14 Abr 2026)
- [x] Mejorar scroll lateral del diagrama de Gantt (drag-to-scroll, scroll fluido)
- [x] Mejorar layout general del diagrama (barras con colores por estado, leyenda, línea "Hoy")
- [x] Implementar descarga del diagrama Gantt como imagen PNG brandeada con html2canvas
- [x] Cronograma incluido en reporte PDF del proyecto (tabla con fechas inicio/fin/duración)
- [x] Diagrama de Gantt simplificado incluido en reporte PDF
- [x] Botón "Reporte Completo" descarga todo junto (reporte + cronograma + Gantt + comentarios)
- [x] Push a GitHub (commit 4a26a57)

## Mejora: Fechas inicio/fin y duración en hitos + Gantt mejorado (14 Abr 2026)
- [x] Agregar campos endDate y durationDays a tabla milestones (startDate ya existía)
- [x] Auto-migración para crear columnas en BD de producción
- [x] Actualizar helpers y procedimientos tRPC para los nuevos campos
- [x] UI hitos: mostrar fecha inicio, fecha fin y duración en días en cada tarjeta
- [x] Cálculo automático con días hábiles al crear hitos desde plantilla
- [x] Configuración includeWeekends en appSettings (admin puede activar fines de semana)
- [x] Gantt usa startDate/endDate reales de cada hito
- [x] Tests: 10 tests pasando (business days + PDF generator)
- [x] Push a GitHub (commit 4a26a57)

## Bug: Loop infinito "Cargando dashboard..." cuando la sesión expira (16 Abr 2026)
- [x] Detectar sesión expirada en Dashboard.tsx (!meQuery.isLoading && !user)
- [x] Detectar timeout en MainLayout.tsx (loading > 8 segundos = sesión colgada)
- [x] Mostrar pantalla profesional "Sesión Expirada" con botón "Iniciar Sesión" y "Reintentar"
- [x] Limpiar localStorage (auth_token, auth_user_email, auth_user_name, manus-runtime-user-info)
- [x] Tests: 7 tests pasando (sessionExpiry.test.ts)
- [x] Push a GitHub (commit 9dd4e2a)

## Bug: Bucle "Sesión Expirada" después de login con Auth0 (16 Abr 2026)
- [x] Dashboard.tsx: eliminada pantalla duplicada de sesión expirada (MainLayout ya lo maneja)
- [x] Dashboard.tsx: meQuery con retry:3 y retryDelay para dar tiempo a Auth0
- [x] MainLayout Auth0: resetear backendError/backendReady cuando Auth0 hace nuevo login
- [x] MainLayout Auth0: estado waitingForToken para esperar a que accessToken esté listo
- [x] MainLayout Auth0: meQuery con retry:3 y retryDelay progresivo
- [x] MainLayout Auth0: condición de espera incluye waitingForToken y auth0.isAuthenticated sin data
- [x] Push a GitHub (commit 84f1a28)

## Bug: Sesión no se cierra automáticamente después de inactividad (17 Abr 2026)
- [x] MainLayout Auth0 reescrito: timeout de 15s, detección de error después de 2 reintentos
- [x] Dashboard.tsx: retorna null cuando no hay usuario (MainLayout maneja redirección)
- [x] Componentes reutilizables: SessionExpiredScreen, LoadingScreen, LoginScreen
- [x] Flujo: Auth0 isLoading → Login → Esperando token → Verificando backend → App (o Sesión Expirada)
- [x] Push a GitHub (commit a2c22fe)

## Bug: Auth0 "Missing Refresh Token" impide iniciar sesión (17 Abr 2026)
- [x] useAuth0Custom.ts: nuevo estado tokenError que se activa con CUALQUIER error de getTokenSilently
- [x] useAuth0Custom.ts: no redirige automáticamente a login (evita bucle), marca tokenError para MainLayout
- [x] MainLayout Auth0: flujo secuencial claro (SDK loading → no auth → token error → waiting token → backend verify → app)
- [x] MainLayout Auth0: cuando tokenError=true, muestra SessionExpiredScreen inmediatamente
- [x] MainLayout Auth0: "Iniciar Sesión" hace logout completo de Auth0 (limpia sesión + localStorage)
- [x] main.tsx: cuando Auth0 configurado, solo limpia localStorage sin redirigir (MainLayout maneja)
- [x] Push a GitHub (commit b112536)

## Bug: Sesión expira después de ~2 minutos (debería durar mínimo 1 hora) (17 Abr 2026)
- [x] Analizar JWT expiración en backend (server/_core) - Auth0 API token lifetime = 86400s (24h) ✅
- [x] Analizar Auth0 token lifetime configuration - API audience = https://solar-project-manager-api ✅
- [x] Analizar timeouts en MainLayout.tsx y useAuth0Custom.ts - Encontrado: tokenError se activaba demasiado rápido
- [x] Corregir duración de sesión a mínimo 1 hora:
  - useAuth0Custom.ts: renovación proactiva cada 50 min con reintentos (3x backoff exponencial)
  - useAuth0Custom.ts: solo marca tokenError después de 2 renovaciones consecutivas fallidas
  - MainLayout.tsx: intenta refreshToken antes de mostrar sesión expirada
  - main.tsx: requiere 3 errores 401 consecutivos antes de limpiar token
  - Queries con staleTime de 5 min para reducir llamadas innecesarias
  - NotificationBell refetchInterval aumentado a 2 min
- [x] Implementar renovación silenciosa de tokens (fetchTokenWithRetry con cacheMode:'off')
- [x] Tests (session-management.test.ts - 11 tests passed)
- [x] Push a GitHub (commit d0ff80f)

## Fix: Exportación Diagrama de Gantt - Error OKLCH + PDF Profesional (17 Abr 2026)
- [x] Analizar código de exportación del Gantt (error "unsupported color function oklch")
- [x] Corregir exportación a imagen: OKLCH_TO_HEX_CSS override stylesheet + onclone regex replace + inline RGB resolve
- [x] Implementar exportación a PDF profesional brandeada con logo GreenH (ganttPdfExport.ts)
- [x] PDF incluye: logo GHP, header gradiente, cards de info, tabla con barras de Gantt visuales, leyenda, footer
- [x] Diseño estético y profesional del PDF (jsPDF landscape A4)
- [x] Tests (gantt-export.test.ts - 24 tests passed)
- [x] Push a GitHub (commit 6482f3a)

## Bug: Tema Claro no se aplica correctamente (17 Abr 2026)
- [x] Analizar implementación del ThemeProvider y CSS variables para tema claro/oscuro
- [x] Verificar que :root tiene colores claros y .dark tiene colores oscuros
- [x] Corregir la lógica de cambio de tema: UserProfile ahora llama setTheme() + MainLayout sincroniza tema de BD
- [x] Tests (dark-mode.test.ts - 53 tests passed)
- [x] Push a GitHub (commit ac07205, incluido en 66c3e88)

## Feature: Soporte completo tema claro/oscuro en toda la UI (17 Abr 2026)
- [x] Sidebar.tsx - dark mode classes (30+ dark: classes)
- [x] MainLayout.tsx - theme sync from DB + dark mode
- [x] Dashboard.tsx - dark mode classes
- [x] Projects.tsx - dark mode classes
- [x] ProjectDetail.tsx - dark mode classes
- [x] EditProject.tsx - dark mode classes
- [x] NewProject.tsx - dark mode classes
- [x] Analytics.tsx - dark mode classes
- [x] AdvancedAnalytics.tsx - dark mode classes
- [x] GanttChart.tsx - dark mode classes + gantt-custom.css dark rules
- [x] Calendar.tsx / CalendarView.tsx - dark mode classes
- [x] UserProfile.tsx - dark mode classes + setTheme() integration
- [x] UserManagement.tsx - dark mode classes
- [x] Settings.tsx - dark mode classes
- [x] NotificationHistory.tsx - dark mode classes
- [x] Reminders.tsx - dark mode classes
- [x] AIAssistant.tsx - dark mode classes
- [x] TramitesYDiseno.tsx - dark mode classes
- [x] Reports.tsx - dark mode classes
- [x] LoginAuth0.tsx - dark mode classes
- [x] Remaining pages (Login, Register, ForgotPassword, NotFound, Home, EmailConfig) - all done
- [x] Tests (dark-mode.test.ts - 53 tests passed)
- [x] Push a GitHub (commit ac07205, incluido en 66c3e88)

## Mejora: Auto-ajuste Fecha Fin + Toggle Días Hábiles (21 Abr 2026)
- [x] Auto-ajuste: Cuando se cambie la fecha de vencimiento, la fecha fin se actualiza automáticamente
- [x] Toggle Días Hábiles Global: Switch en SystemConfiguration (tab "Días Hábiles")
- [x] Toggle Días Hábiles por Hito: Toggle individual en cada hito card en ProjectDetail
- [x] Backend: recalculateWithWeekends procedure en milestones router
- [x] Backend: usa addBusinessDays de shared/businessDays.ts para recalcular
- [x] Frontend: Toggle Switch por hito + label dinámico (calendario/hábiles)
- [x] Tests (weekends-toggle.test.ts - 27 tests passed)
- [x] Push a GitHub (commit ad5738f)

## Fix: Responsive móvil en ProjectDetail (29 Abr 2026)
- [x] Tabs de navegación (Hitos, Actualizaciones, etc.) se cortan en móvil - hacer scrollable horizontal con overflow-x-auto y scrollbar-thin
- [x] Hitos se desbordan de la pantalla - campos de fecha y responsable se apilan verticalmente en móvil (grid-cols-1 sm:grid-cols-2)
- [x] Botones "Cargar Hitos Predeterminados" y "Agregar Hito" se desbordan - flex-wrap con texto reducido en móvil
- [x] Campos de fecha (Inicio, Fin, Vencimiento, Días) se apilan en 2 columnas en móvil (grid-cols-2 sm:grid-cols-[1fr_1fr_5rem])
- [x] Toggle de días hábiles responsive (ya tenía buena estructura)
- [x] Info cards (Progreso, Cronograma, Cliente) se apilan en móvil (grid-cols-1 sm:grid-cols-2 md:grid-cols-3)
- [x] Título del proyecto responsive (text-xl sm:text-2xl md:text-4xl con truncate)
- [x] Botones de header responsive (text-xs sm:text-sm, texto abreviado en móvil)
- [x] Container padding reducido en móvil (py-4 sm:py-8, px-3 sm:px-4)
- [x] Tests actualizados (weekends-toggle test corregido: settings → appSettings)
- [x] Push a GitHub (commit 99f17a0)

## API REST Pública para Integración Externa (04 May 2026)
- [x] Crear endpoints REST bajo /api/v1/ con autenticación por API Key
- [x] Endpoint GET /api/v1/projects - Listar proyectos
- [x] Endpoint GET /api/v1/projects/:id - Detalle de proyecto
- [x] Endpoint GET /api/v1/projects/:id/milestones - Hitos de un proyecto
- [x] Endpoint PATCH /api/v1/milestones/:id - Actualizar estado de hito
- [x] Endpoint GET /api/v1/stats - Estadísticas generales
- [x] Crear sistema de API Keys para autenticación externa (tabla api_keys + hash SHA-256)
- [x] Crear página /api-docs con documentación interactiva
- [x] Crear documento Markdown con documentación completa (API_DOCUMENTATION.md)
- [x] Endpoint GET /api/v1/milestones/:id - Detalle de hito
- [x] Endpoint POST /api/v1/keys/generate - Generar API Key (admin)
- [x] Endpoint GET /api/v1/keys - Listar API Keys (admin)
- [x] Endpoint DELETE /api/v1/keys/:id - Desactivar API Key (admin)
- [x] Router tRPC apiKeyManagement para gestión desde UI
- [x] Tests vitest (12 tests pasando)
- [x] Push a GitHub (commit 1e5043a)

## UI de Gestión de API Keys + Webhooks (04 May 2026)
- [x] Crear página ApiKeysSettings.tsx en Configuración con UI para generar/ver/desactivar keys
- [x] Agregar sección de API Keys en Settings.tsx
- [x] Crear tabla webhooks en DB (nombre, url, secret, events, isActive, failCount)
- [x] Crear tabla outgoing_webhook_logs para auditoría de envíos
- [x] Crear endpoints REST /api/v1/webhooks (GET, POST, DELETE)
- [x] Crear router tRPC webhookManagement (list, create, update, delete, logs, test)
- [x] Implementar webhookService.ts con lógica de disparo (HMAC-SHA256, timeout, retry)
- [x] Integrar triggers en router de milestones (status_changed, completed)
- [x] Trigger automático cuando proyecto se completa (todos hitos completados)
- [x] Desactivación automática después de 10 fallos consecutivos
- [x] Crear WebhookSettings.tsx con UI completa (crear, test ping, ver logs, activar/desactivar)
- [x] Documentar webhooks en /api-docs (eventos, firma, headers, endpoints)
- [x] Tests pasan (api-v1.test.ts + weekends-toggle.test.ts)
- [x] Push a GitHub (commit aa8d626)

## Bug: No se puede crear API Key - Error INSERT (04 May 2026)
- [x] Diagnosticar error: expiresAt null + userId posiblemente string causaba crash en Drizzle/MySQL
- [x] Corregir procedimiento: usar undefined en vez de null, parseInt userId, try-catch robusto
- [x] Agregar try-catch al middleware de autenticación REST (evitar 502 en Railway)
- [x] Probar creación de key exitosa en servidor local con 90 días de expiración
- [x] Push a GitHub (commit e7ed3ff, incluido en 66c3e88)

## Bug RESUELTO: Fecha Estimada de Finalización no se guarda al editar (06 May 2026)
- [x] Diagnosticar: handleSubmit en EditProject.tsx NO incluía startDate ni estimatedEndDate en mutateAsync
- [x] Corregir frontend: agregar startDate y estimatedEndDate al mutateAsync
- [x] Corregir backend: agregar startDate y estimatedEndDate al schema z.object del input del procedimiento update
- [x] Corregir backend: convertir strings a Date con T12:00:00 para evitar problemas de timezone
- [x] Probar que la fecha se guarda correctamente (verificado en DB: 2026-12-31)
- [x] Push a GitHub (commit 5eb0420, incluido en 66c3e88)

## Bug Fix: API Key INTERNAL_ERROR en producción + Creación de proyectos (08 May 2026)
- [x] Diagnosticar: middleware de API Key usa Drizzle ORM con columna `key` (palabra reservada MySQL) → crash en producción
- [x] Corregir: cambiar query de validación de API Key a raw SQL con backticks explícitos
- [x] Corregir: cambiar UPDATE lastUsedAt a raw SQL también
- [x] Diagnosticar: insertId de createProject no se extraía correctamente (result es array [ResultSetHeader, null])
- [x] Corregir: usar (result as any)[0]?.insertId || (result as any).insertId para projects y milestones
- [x] Tests API v1 pasan (12/12)
- [x] Tests weekends-toggle pasan (27/27)
- [x] Guardar checkpoint (70ee8638)
- [x] Push a GitHub (commit 70ee863)

## Bug Fix DEFINITIVO: INSERT API Key falla con sql template literal en producción (09 May 2026)
- [x] Diagnosticar: sql template literal de Drizzle no pasa correctamente Date objects ni null como params en producción (TiDB)
- [x] Corregir: reemplazar sql template literal por sql.raw() con valores escapados manualmente
- [x] Convertir expiresAt de Date a string ISO formateado para MySQL ('YYYY-MM-DD HH:MM:SS')
- [x] Usar NULL literal cuando no hay expiración en vez de pasar null como param
- [x] Agregar escapeSql() para prevenir SQL injection en valores de usuario
- [x] Tests locales exitosos: con expiración, sin expiración, y con caracteres especiales
- [x] Tests API v1 pasan (12/12)
- [x] Renombrar columnas en DB: key->keyHash, secret->secretKey, events->eventTypes
- [x] Actualizar schema.ts con nuevos nombres de columna
- [x] Actualizar routers.ts (apiKeyManagement, webhookManagement)
- [x] Actualizar webhookService.ts
- [x] Actualizar api-v1.ts (middleware + endpoints)
- [x] TypeScript sin errores
- [x] Tests API v1 pasan (12/12)
- [x] Tests de INSERT/SELECT con Drizzle ORM exitosos
- [x] Guardar checkpoint (aff24284)
- [x] Push a GitHub
- [x] Crear tablas api_keys, webhooks, webhook_logs en DB de Railway (no existían)

## Bug Fix: CORS en API v1 para integración cross-origin (09 May 2026)
- [x] Diagnosticar: "Failed to fetch" al probar conexión desde GHP Center → falta CORS en API v1
- [x] Agregar middleware CORS al apiRouter con Access-Control-Allow-Origin: *
- [x] Manejar preflight OPTIONS con respuesta 204
- [x] Permitir headers: Content-Type, Authorization, X-API-Key
- [x] Guardar checkpoint (commit c965a3e)
- [x] Push a GitHub (commit c965a3e, incluido en 66c3e88)

## Bug Fix: Fecha estimada de finalización no se guarda al editar proyecto (10 May 2026)
- [x] Investigar procedimiento update de proyectos (backend) - backend OK, fecha se guarda correctamente en DB
- [x] Verificar qué campos se envían desde el frontend (EditProject.tsx) - campos OK
- [x] Diagnosticar: falta invalidar cache tRPC después del update → UI muestra datos stale
- [x] Corregir: agregar utils.projects.getById.invalidate() y utils.projects.list.invalidate() en EditProject.tsx
- [x] Probar localmente (verificado)
- [x] Guardar checkpoint y push a GitHub (incluido en 66c3e88)

## Feature: Control de Registro de Usuarios (20 May 2026)
- [x] Agregar campo 'status' (pending/approved/rejected) a tabla users
- [x] Modificar registro: nuevos usuarios quedan en 'pending'
- [x] Modificar login: bloquear usuarios no aprobados
- [x] UI admin: lista de usuarios pendientes con botones aprobar/rechazar
- [x] Asignar rol al aprobar
- [x] Notificar al admin cuando hay un nuevo registro pendiente
- [x] Migrar DB (Railway + Manus)

## Feature: Portal de Cliente (20 May 2026)
- [x] Agregar rol 'client' al enum de roles en schema
- [x] Crear tabla client_project_access (vincula clientes con proyectos)
- [x] Backend: procedimientos para portal de cliente (myProjects, projectDetail, projectUpdates)
- [x] Frontend: nueva ruta /portal con diseño profesional
- [x] Vista de proyecto para cliente: progreso, hitos (sin detalles internos), cronograma
- [x] Actualizaciones públicas del proyecto
- [x] Admin: asignar/revocar acceso de clientes a proyectos
- [x] Tab de clientes en gestión de usuarios

## Feature: SSO / API Token para acceso desde otras apps (20 May 2026)
- [x] Endpoint POST /api/sso/token - generar token temporal con API Key + email del cliente
- [x] Endpoint GET /api/sso/login?token=xxx - consumir token, crear sesión, redirigir al portal
- [x] Endpoint POST /api/sso/validate - verificar sesión activa
- [x] Permitir que GHP Center autentique clientes y los redirija al portal
- [x] Auto-crear usuario cliente si no existe (vía SSO con API Key admin)
- [x] Documentar flujo SSO en /api-docs (agregado sección SSO completa en ApiDocs.tsx)
## Fix: Roles y Auto-vinculación de Proyectos (20 May 2026)
- [x] Agregar opción "Cliente" al dropdown de roles en UserManagement.tsx
- [x] Cambiar rol por defecto de "engineer" a "client" al registrarse
- [x] Auto-vincular proyectos por email del cliente al registrarse (buscar en projects.clientEmail)
- [x] Redirigir según rol: clientes → /portal, admins/ingenieros → /dashboard
- [x] Probar flujo completo
- [x] Guardar checkpoint y push a GitHub

## Fix: Logout del Portal de Cliente no funciona (20 May 2026)
- [x] Problema: useAuth().logout() solo limpia cookies del backend pero NO cierra sesión de Auth0
- [x] Solución: Usar useAuth0Custom().logout() que llama a auth0Logout({returnTo: origin})
- [x] Corregido ClientLogoutButton para detectar Auth0 y usar el logout correcto (igual que Sidebar)
- [x] Corregido Home.tsx: usar backendUser (de trpc.auth.me) para obtener el rol real, no auth0.user

## Fix: Portal no muestra proyectos asociados al cliente (20 May 2026)
- [x] Problema: myProjects solo buscaba en client_project_access (tabla vacía) sin buscar por email directo
- [x] auth0Service.ts creaba usuarios con rol 'engineer' en vez de 'client'
- [x] No había auto-vinculación de proyectos cuando usuario se registra vía Auth0
- [x] Solución: myProjects ahora busca en AMBAS fuentes (client_project_access + projects.clientEmail)
- [x] projectDetail y projectUpdates también verifican acceso por email directo
- [x] auth0Service.ts ahora asigna rol 'client' y auto-vincula proyectos al crear usuario
- [x] upsertUser default cambiado de 'engineer' a 'client'

## Feature: Sistema de Notificaciones por Email para Hitos Vencidos (25 May 2026)
- [x] Crear tabla milestone_reminder_config (configuración admin del sistema)
- [x] Crear tabla milestone_reminder_logs (registro de emails enviados)
- [x] Implementar Heartbeat job diario para detectar hitos vencidos y enviar emails
- [x] Crear template de email HTML profesional con niveles de urgencia (recordatorio/urgente/crítico)
- [x] Implementar procedimientos tRPC para configuración admin (activar/desactivar, horario, niveles)
- [x] Crear UI de configuración admin en panel de Configuración
- [x] Crear formulario público de justificación de reprogramación (accesible desde email)
- [x] Enviar copia al admin (CC) para trazabilidad
- [x] Usar Resend como proveedor de email (admin@greenhproject.com)
- [x] Guardar checkpoint y push a GitHub

## Fix: Responsive Layout MilestoneRemindersConfig (26 May 2026)
- [x] Header: flex-col sm:flex-row, responsive text sizes, badge hidden on mobile
- [x] Tabs: w-full overflow-x-auto flex, responsive text sizes, "Config" abbreviation on mobile
- [x] Urgency levels grid: sm:grid-cols-2 lg:grid-cols-3, responsive padding
- [x] Scheduling grid: sm:grid-cols-2 instead of md:grid-cols-2
- [x] Logs list: items stack vertically on mobile with flex-col sm:flex-row, truncate email
- [x] Test tab: input+button flex-col sm:flex-row, button w-full sm:w-auto
- [x] Guardar checkpoint y push a GitHub

## Feature: Botón "Invitar Cliente" en Detalle de Proyecto (26 May 2026)
- [x] Crear procedimiento tRPC para enviar email de invitación al cliente
- [x] Diseñar template HTML profesional de invitación al portal
- [x] Agregar botón "Invitar Cliente" en la vista de detalle de proyecto (ProjectDetail.tsx)
- [x] Incluir datos de acceso y enlace directo al portal en el email
- [x] Validar que el proyecto tenga clientEmail antes de enviar
- [x] Guardar checkpoint y push a GitHub

## Fix: Reemplazar Heartbeat de Manus por cron interno para Railway (26 May 2026)
- [x] Instalar node-cron como dependencia
- [x] Crear módulo cronScheduler.ts con sistema de cron interno
- [x] Modificar milestone-reminder-config.ts para usar cron interno en vez de Heartbeat API
- [x] Registrar el cron scheduler en el arranque del servidor
- [x] Mantener el endpoint /api/scheduled/milestone-reminders como fallback
- [x] Guardar checkpoint y push a GitHub

## Fix: Justificación de reprogramación debe quedar registrada en el hito (26 May 2026)
- [x] Investigar el procedimiento de reprogramación actual (rescheduleMilestone)
- [x] Modificar el backend para guardar la justificación como nota del hito
- [x] Agregar visualización del historial de reprogramaciones en ProjectDetail
- [x] Guardar checkpoint y push a GitHub (incluido en 66c3e88)

## Refactor: Eliminar redundancia Fecha vencimiento vs Fecha fin en hitos (26 May 2026)
- [x] Eliminar campo "Fecha de vencimiento" separado del UI de hitos
- [x] Unificar: Fecha fin = Fecha de vencimiento (dueDate)
- [x] Sincronización automática: cambiar inicio → recalcula fin; cambiar días → recalcula fin; cambiar fin → recalcula días
- [x] Ajustar backend para que dueDate siempre se sincronice con endDate
- [x] Guardar checkpoint y push a GitHub (incluido en 66c3e88)

## Feature: Cron para actualizar status de hitos vencidos (30 May 2026)
- [x] Crear función que actualice status de hitos vencidos (pending/in_progress → overdue cuando dueDate < now)
- [x] Registrar cron job cada hora en cronScheduler
- [x] Guardar checkpoint y push a GitHub

## Feature: Filtro por ingeniero en Análisis Avanzado (30 May 2026)
- [x] Agregar input opcional de engineerId al procedimiento analytics.dashboardStats
- [x] Crear procedimiento para listar ingenieros disponibles
- [x] Agregar selector de ingeniero en el frontend de AdvancedAnalytics
- [x] Filtrar todas las métricas según el ingeniero seleccionado
- [x] Guardar checkpoint y push a GitHub

## Fix: Corregir métricas inconsistentes en Análisis Avanzado por ingeniero (30 May 2026)
- [x] Reescribir metricsCalculator para filtrar correctamente por assignedUserId
- [x] Progreso Promedio: solo proyectos donde el ingeniero tiene hitos asignados
- [x] Hitos Completados/Totales: solo hitos asignados al ingeniero
- [x] Hitos Vencidos: solo hitos del ingeniero con dueDate < now
- [x] Proyectos Retrasados: solo proyectos con hitos vencidos del ingeniero
- [x] Proyectos Activos: solo proyectos donde el ingeniero tiene hitos
- [x] Velocidad: solo hitos completados por ese ingeniero por mes

## Feature: Score de Desempeño por Ingeniero (30 May 2026)
- [x] Diseñar fórmula del score (completados a tiempo, vencidos, velocidad)
- [x] Implementar cálculo del score en metricsCalculator (sin tabla BD, cálculo en tiempo real)
- [x] Crear cron mensual que evalúe y envíe email de felicitación (score >= 80) o alerta de mejora (score < 60)
- [x] Mostrar score en el frontend de Análisis Avanzado
- [x] Mostrar ranking de ingenieros cuando no hay filtro
- [x] Manejar caso sin datos (score = -1)
- [x] Guardar checkpoint y push a GitHub

## Fix: Filtrar clientes del selector de responsable de hito (30 May 2026)
- [x] Filtrar selector de responsable para mostrar solo admin/engineer (excluir client)
- [x] Guardar checkpoint y push a GitHub

## Fix: Hitos retrasados no aparecen + status no se revierte al reprogramar (04 Jun 2026)
- [x] Al reprogramar un hito a fecha futura, revertir status de 'overdue' a 'pending' (requestReschedule + updateDueDate + cascada)
- [x] Verificar que la página de Recordatorios muestra sección de Hitos Vencidos (agregado status 'overdue' al query getOverdueMilestones)
- [x] Guardar checkpoint y push a GitHub

## Fix: Dashboard muestra 0 en 'Con Retraso' cuando hay hitos vencidos (04 Jun 2026)
- [x] getProjectStats() no incluía status 'overdue' en la consulta de hitos vencidos (mismo bug que getOverdueMilestones)
- [x] Guardar checkpoint y push a GitHub

## Fix: Hitos que vencen hoy desaparecen de Recordatorios (13 Jun 2026)
- [x] Cambiar getOverdueMilestones para usar inicio del día (lt startOfToday) en vez de hora exacta
- [x] Cambiar getUpcomingMilestones para usar inicio del día como límite inferior (gte startOfToday)
- [x] Actualizar getProjectStats para usar misma lógica de inicio del día
- [x] Actualizar updateOverdueMilestoneStatuses (cron) para solo marcar overdue hitos de ANTES de hoy
- [x] Actualizar milestone-reminders.ts para consistencia
- [x] Actualizar metricsCalculator.ts (calculateDashboardStats y calculatePerformanceScore)
- [x] Guardar checkpoint y push a GitHub

## Fase 1: Seguridad Crítica - Auditoría Enterprise Grade (19 Jun 2026)
- [x] Instalar helmet y express-rate-limit
- [x] Implementar rate limiting en login, registro, forgot-password, API REST y SSO
- [x] Corregir Open Redirect en SSO (validar redirectTo contra whitelist)
- [x] Migrar tokens SSO de memoria a base de datos con TTL
- [x] Configurar Helmet para security headers
- [x] Reducir expiración JWT de 30 días a 7 días
- [x] Verificar que todo compila y tests pasan (13 tests de seguridad OK)
- [x] Checkpoint y push a GitHub

## Sistema SSO para aplicaciones de terceros (20 Jun 2026)
- [x] Crear tabla sso_apps en schema (nombre, url, secret, isActive, roleMapping, etc.)
- [x] Crear tabla sso_access_logs para historial de accesos
- [x] Agregar SSO_SECRET a env.ts
- [x] Crear router tRPC ssoManagement (CRUD de apps, activar/desactivar, historial)
- [x] Endpoint SSO /api/sso/token genera JWT con jose, mapeo de roles y log de accesos
- [x] Crear componente frontend SsoSettings.tsx con UI de gestión
- [x] Agregar sección SSO en Settings.tsx
- [x] Tests del sistema SSO (17 tests pasando)
- [x] Checkpoint y push a GitHub

## Endpoint receptor SSO /api/sso/callback (20 Jun 2026)
- [x] Crear endpoint /api/sso/callback que reciba token JWT del Hub
- [x] Verificar firma del token con CRM_SSO_SECRET
- [x] Buscar o crear usuario en SPM basado en email del token
- [x] Crear sesión local (cookie JWT de SPM) y redirigir al dashboard
- [x] Configurar CRM_SSO_SECRET como variable de entorno
- [x] Tests (7/7 pasando)
- [x] Checkpoint y push a GitHub

## Panel SSO Unificado (20 Jun 2026)
- [x] Reescribir SsoSettings.tsx como panel unificado eliminando redundancia
- [x] URL de callback visible y copiable
- [x] Secret compartido: ver/copiar/generar/renovar con toggle de visibilidad
- [x] Aplicaciones conectadas con gestión completa (crear, activar, desactivar, eliminar)
- [x] Historial de accesos integrado en el mismo panel
- [x] Estadísticas de apps/activas/accesos en header
- [x] Responsive para móviles
- [x] Checkpoint y push a GitHub

## Fix: Login post-SSO redirige a Auth0 en vez de Hub GHP (21 Jun 2026)
- [x] Detectar origen de sesión SSO (loginMethod en usuario) en frontend
- [x] Cuando sesión SSO expira, redirigir al Hub GHP en vez de Auth0
- [x] Botón "Iniciar Sesión" en Home debe redirigir según contexto (SSO vs Auth0)
- [x] Backend context.ts: verificar JWT cookie PRIMERO (SSO) antes de Auth0
- [x] MainLayout: habilitar meQuery siempre para detectar sesiones SSO sin Auth0
- [x] Sidebar/ClientPortal logout: respetar loginMethod del usuario
- [x] Checkpoint y push a GitHub

## Fix: SSO callback no actualiza rol de usuario existente (21 Jun 2026)
- [x] SSO callback debe actualizar el rol del usuario existente con el mapeo del Hub
- [x] Actualizar loginMethod a 'sso' cuando usuario existente entra por SSO
- [x] Verificar que greenhproject@gmail.com mantiene rol admin al entrar por SSO
- [x] Checkpoint y push a GitHub

## Fix: Rol SSO con espacio + Auth0 login directo (21 Jun 2026)
- [x] Hub GHP envía rol con espacio ("Admin ") - agregar .trim() al extraer rol del JWT
- [x] context.ts: no usar Manus OAuth cuando Auth0 está configurado (evita error 403 en Railway)
- [x] Ambos sistemas coexisten: SSO (cookie JWT) + Auth0 (Bearer token) en producción
- [x] Checkpoint y push a GitHub

## Fix: Logout no funciona + Proyectos diferentes entre Auth0 y SSO (22 Jun 2026)
- [x] SSO callback NO debe sobrescribir loginMethod si usuario ya tiene uno (Auth0 user)
- [x] SSO callback NO debe degradar rol admin (admin es el rol más alto)
- [x] Auth0Service debe restaurar loginMethod cuando usuario entra por Auth0
- [x] Logout: verificar sesión Auth0 activa (no solo loginMethod de BD) para decidir qué logout usar
- [x] DB fix: restaurar loginMethod='google' y role='admin' para greenhproject@gmail.com
- [x] Tests: 13 tests pasando (sso-auth-fix.test.ts)
- [x] Checkpoint y push a GitHub (commit 4bc1202)

## Fix: SSO redirige a /portal en vez de /dashboard para admin (22 Jun 2026)
- [x] SSO login (token-based): redirigir según rol del usuario en vez de siempre a /portal
- [x] ClientPortal.tsx: si usuario es admin/engineer, redirigir automáticamente a /dashboard o /projects
- [x] Fix TS2872 error en milestone-reminder-config.ts (rows.length check en vez de !config)
- [x] Checkpoint y push a GitHub (commit 70ea43e)

## Fix: Roles sobrescritos a 'client' en cada login (22 Jun 2026)

- [x] Corregir rol de Jean Arias (proyectos@greenhproject.com) a 'engineer' en BD producción
- [x] Corregir rol de greenhproject@gmail.com a 'admin' en BD producción
- [x] Identificar causa raíz: upsertUser incluía role='client' en updateSet cuando no se pasaba rol explícito
- [x] Fix: NO incluir role en onDuplicateKeyUpdate cuando no se pasa explícitamente (preservar rol existente)
- [x] Actualizar test auth.logout para reflejar que logout limpia 2 cookies (OAuth + JWT)
- [x] Verificar TypeScript compila sin errores (exit code 0)
- [x] Verificar tests de auth pasan (auth.logout + sso-callback: 9 tests passing)
- [x] Push a GitHub y verificar deploy en Railway (commit 03be3e9d, incluido en 66c3e88)

## Simplificación de Auth: Login solo valida email, NO toca roles (22 Jun 2026)

- [x] upsertUser en db.ts: NUNCA incluir role en onDuplicateKeyUpdate (excepto admin maestro)
- [x] auth0Service.ts: No pasar role al hacer upsert de usuario existente
- [x] SSO callback: Eliminar mapeo de roles del Hub, solo autenticar por email
- [x] Mantener protección: greenhproject@gmail.com siempre es admin (hardcoded)
- [x] Nuevos usuarios: role='client' por defecto (admin lo cambia desde UI)
- [x] Verificar TypeScript y tests
- [x] Push a GitHub para deploy en Railway

## Bug: Dashboard stats en 0 y Recordatorios vacíos para engineers (22 Jun 2026)

- [x] Investigar por qué dashboard muestra Total/En Progreso/Completados/Con Retraso = 0 para engineers
- [x] Investigar por qué Recordatorios muestra "No hay hitos próximos a vencer" cuando debería haber
- [x] Causa raíz: usuarios tenían rol 'client' en BD (ya corregido) + Auth0 login creaba usuario fantasma
- [x] Corregir roles en BD producción
- [x] Push a GitHub para deploy en Railway (incluido en 66c3e88)

## Bug: Login Auth0/Google se queda en "Verificando sesión..." infinito (23 Jun 2026)

- [x] Identificar causa: upsertUser falla con 'Duplicate entry email' cuando openId es diferente
- [x] Problema: usuario SSO (openId=jwt_xxx) y Auth0 (openId=google-oauth2|xxx) comparten email
- [x] Fix: auth0Service.ts usa UPDATE directo (updateUserOpenIdAndLogin) para migrar openId sin conflicto
- [x] Nueva función db.ts: updateUserOpenIdAndLogin - UPDATE por ID, no INSERT
- [x] Protección: si no hay email en token, rechazar (no crear usuarios fantasma)
- [x] Limpiar BD: eliminar usuario fantasma (id 71579), migrar openId de Jean Arias
- [x] Verificar TypeScript compila sin errores
- [x] Push a GitHub para deploy en Railway (commit b51fa829, incluido en 66c3e88)

## Fix: Permitir cambiar rol de usuarios desde pestaña Clientes (22 Jul 2026)

- [x] Agregar opción para cambiar rol desde la vista de Clientes en Gestión de Usuarios
- [x] Checkpoint y push a GitHub (commit 2e98383)

## Feature: Nuevo rol Admin Financiero (23 Jul 2026)

- [x] Agregar 'admin_financiero' al enum de roles en drizzle/schema.ts
- [x] Push migración de BD (ALTER TABLE directo)
- [x] Backend: admin_financiero ve TODOS los proyectos (como admin)
- [x] Backend: admin_financiero ve TODOS los hitos de un proyecto
- [x] Backend: admin_financiero solo puede marcar como completados sus hitos asignados
- [x] Backend: admin_financiero NO puede crear/editar proyectos
- [x] Frontend: routing y dashboard para admin_financiero (vista financiera/global)
- [x] Frontend: dentro de proyecto, ver todos los hitos pero solo interactuar con los propios
- [x] UserManagement: agregar admin_financiero al selector de roles
- [x] Recordatorios: admin_financiero ve sus hitos asignados
- [x] Checkpoint y push a GitHub (commit 1cda3e7e)

## Bug: Cambio de rol no funciona + responsive roto en Activos (24 Jul 2026)

- [x] Verificar que BD producción tenga admin_financiero en enum
- [x] Fix responsive: dropdown de rol se superpone con nombre en móviles (tab Activos/Admins)
- [x] Checkpoint y push a GitHub (commit 1cda3e7)

## Bug: Reprogramación de hitos no actualiza fechas correctamente (25 Jul 2026)

- [x] Investigar lógica de reprogramación en backend (milestones.reschedule)
- [x] Fix: cuando se reprograma, actualizar startDate recalculando con duración
- [x] Fix: enviar notificación al responsable cuando su hito es reprogramado
- [x] Fix: enviar copia al remitente para trazabilidad
- [x] Fix: también corregido updateDueDate para recalcular startDate
- [x] Verificar que las notificaciones/recordatorios usen las fechas actualizadas
- [x] Nueva función subtractBusinessDays en shared/businessDays.ts
- [x] Checkpoint y push a GitHub (commit dc1a64a)

## Mejora: Permitir admin_financiero descargar reportes (27 Jul 2026)

- [x] Agregar permiso de generación de reportes para admin_financiero en backend
- [x] Frontend ya muestra botón para todos los roles (no necesita cambio)
- [x] Checkpoint y push a GitHub (commit 66c3e88)

## Bug: Portal del cliente muestra 0% progreso y "Planificación" aunque hay hitos completados (04 Ago 2026)
- [x] Fix 1: Portal calcula progreso en tiempo real desde hitos (no confiar en campo almacenado)
- [x] Fix 2: API v1 PATCH /milestones/:id debe actualizar projects.status además de progressPercentage
- [x] Fix 3: Portal lista de proyectos también debe calcular progreso en tiempo real
- [x] Verificar que el fix funciona correctamente (10 tests pasando)
- [x] Guardar checkpoint y push a GitHub (commit 6e373cba)

## Optimización: Reducir tiempo de build en Railway (04 Ago 2026)
- [x] Quitar libreoffice-still de nixpacks.toml (ahorraba ~600MB+ de dependencias)
- [x] Quitar libreoffice-convert de package.json (el fallback a .docx ya existía)
- [x] Quitar puppeteer de ignoredBuiltDependencies (no se usa en ningún archivo)
- [x] Refactorizar generateDocument para guardar .docx directamente sin conversión
- [x] Guardar checkpoint y push a GitHub (commit 6e373cba)

## Fix Robusto: Progreso 0% en Portal - Electrolinera Villa del Prado (04 Ago 2026)
- [x] Paso 1: Considerar completedDate como señal de completado en client-portal.ts
- [x] Paso 1b: Considerar completedDate en progressCalculator.ts
- [x] Paso 2: Migración de datos en scripts/migrate-production.mjs
- [x] Paso 3: Normalización centralizada en server/db.ts (normalizeMilestoneState)
- [x] Paso 3b: Aplicar normalización en routers.ts y api-v1.ts (ya usa db.updateMilestone que normaliza)
- [x] Paso 4: Tests unitarios (13 tests normalización + 10 tests portal)
- [ ] Guardar checkpoint y push a GitHub
