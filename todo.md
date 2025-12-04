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
