# Solar Project Manager - Lista de Tareas

## Base de Datos y Backend
- [x] Diseñar esquema de base de datos completo (proyectos, hitos, recordatorios, tipos de proyecto, sincronización OpenSolar)
- [x] Implementar tablas con relaciones y restricciones
- [x] Crear procedimientos tRPC para gestión de proyectos
- [x] Crear procedimientos tRPC para gestión de hitos
- [x] Crear procedimientos tRPC para gestión de recordatorios
- [x] Crear procedimientos tRPC para configuración de tipos de proyecto
- [x] Implementar lógica de detección de retrasos automática

## Autenticación y Roles
- [x] Configurar sistema de autenticación basado en roles (Admin/Ingeniero)
- [x] Implementar control de acceso basado en roles (RBAC)
- [x] Crear procedimientos protegidos para administradores
- [x] Limitar acceso de ingenieros solo a sus proyectos asignados

## Dashboard Principal
- [x] Crear página de dashboard con estadísticas generales
- [x] Mostrar resumen de proyectos activos, completados y retrasados
- [x] Implementar gráficos de progreso general
- [x] Mostrar alertas de proyectos con retrasos
- [x] Implementar filtros y búsqueda de proyectos

## Gestión de Proyectos
- [x] Crear página de listado de proyectos
- [x] Implementar formulario de creación de proyectos
- [x] Implementar formulario de edición de proyectos
- [x] Mostrar detalles completos de proyecto con progreso
- [x] Implementar visualización de estado del proyecto (en tiempo, retrasado, completado)
- [x] Permitir asignación de ingenieros a proyectos

## Gestión de Hitos
- [x] Crear sistema de hitos configurables por proyecto
- [x] Implementar plantillas de hitos reutilizables
- [x] Permitir agregar/editar/eliminar hitos personalizados
- [x] Mostrar progreso de hitos con indicadores visuales
- [x] Implementar cálculo automático de progreso del proyecto basado en hitos
- [x] Detectar y resaltar hitos vencidos

## Sistema de Recordatorios
- [x] Crear tabla de recordatorios en base de datos
- [x] Implementar creación de recordatorios automáticos para hitos próximos
- [x] Permitir creación manual de recordatorios personalizados
- [x] Mostrar notificaciones de recordatorios pendientes
- [x] Implementar sistema de notificaciones para coordinadores

## Configuración de Administrador
- [x] Crear panel de configuración para administradores
- [x] Permitir configuración de tipos de proyectos solares
- [x] Permitir configuración de plantillas de hitos
- [x] Implementar gestión de usuarios y asignación de roles
- [x] Configurar tiempos estándar por tipo de proyecto

## Generación de Reportes PDF
- [x] Implementar generación de reportes ejecutivos en PDF
- [x] Incluir métricas clave del proyecto en reportes
- [x] Mostrar progreso de hitos en reportes
- [x] Incluir gráficos de avance en reportes
- [x] Permitir descarga de reportes individuales por proyecto
- [x] Permitir descarga de reportes consolidados de múltiples proyectos

## Integración con OpenSolar API
- [x] Investigar y documentar API de OpenSolar
- [x] Implementar autenticación con API de OpenSolar
- [x] Crear procedimientos para sincronización de proyectos
- [x] Implementar sincronización bidireccional de datos
- [x] Guardar logs de sincronización
- [x] Mostrar estado de sincronización en interfaz
- [x] Implementar manejo de errores de sincronización

## Diseño y UX
- [x] Implementar diseño limpio tipo Apple con paleta de colores moderna
- [x] Aplicar diseño responsive optimizado para móviles
- [x] Crear navegación intuitiva con sidebar para administradores
- [x] Implementar tema de colores consistente (naranja/ámbar según contexto solar)
- [x] Agregar animaciones y transiciones suaves
- [x] Implementar estados de carga con skeletons
- [x] Optimizar experiencia móvil con menú hamburguesa

## Testing y Validación
- [x] Crear tests unitarios para procedimientos críticos
- [x] Validar flujos de autenticación y autorización
- [x] Probar generación de reportes PDF
- [x] Validar integración con OpenSolar API
- [x] Realizar pruebas de responsividad en diferentes dispositivos

## Documentación y Despliegue
- [x] Documentar código fuente en español
- [x] Crear guía de usuario
- [ ] Crear checkpoint final
- [ ] Preparar para despliegue


## Mejoras de Interfaz y Navegación
- [x] Implementar menú lateral deslizable (sidebar) con todas las páginas
- [x] Agregar opción de cerrar sesión en el menú lateral
- [x] Mejorar navegación con iconos y organización clara
- [x] Hacer el sidebar responsive (colapsable en móvil)

## Gestión Avanzada de Usuarios
- [x] Crear página de gestión de usuarios (solo admin)
- [x] Permitir cambiar roles de usuarios (admin/ingeniero)
- [x] Configurar registro por defecto como "ingeniero"
- [x] Establecer greenhproject@gmail.com como usuario maestro (admin permanente)
- [x] Prevenir cambio de rol del usuario maestro
- [x] Agregar funcionalidad de eliminar usuarios

## Asistente de IA para Análisis de Proyectos
- [x] Integrar LLM para análisis de flujo de proyectos
- [x] Detectar automáticamente problemas en proyectos
- [x] Generar sugerencias de mejora personalizadas
- [x] Crear interfaz de chat para el asistente de IA
- [x] Permitir consultas sobre proyectos específicos
- [x] Analizar patrones de retrasos y cuellos de botella
- [x] Sugerir optimizaciones de recursos y tiempos

## Optimizaciones Adicionales
- [x] Mejorar diseño visual del dashboard
- [x] Agregar más gráficos y visualizaciones
- [x] Implementar búsqueda global en toda la aplicación
- [x] Agregar filtros avanzados en listados


## Correcciones Urgentes
- [x] Corregir botón "Nuevo Proyecto" en Dashboard para que sea visible y funcional
- [x] Mejorar navegación desde Dashboard a formulario de creación de proyectos
- [x] Asegurar que administradores puedan crear proyectos fácilmente
- [x] Hacer la barra lateral colapsable para ahorrar espacio en pantalla
- [x] Mostrar solo iconos cuando la barra lateral esté colapsada
- [x] Agregar botón de toggle para expandir/colapsar sidebar
- [x] Corregir elementos <a> anidados en Sidebar (error de React)
- [x] Corregir Select.Item con value vacío en NewProject.tsx


## Mejoras Avanzadas - Fase 2

### Dashboard de Métricas Avanzadas
- [x] Crear tabla de métricas mensuales en base de datos
- [x] Implementar gráfico de línea temporal de proyectos por mes
- [x] Agregar gráfico de tasa de completación
- [x] Mostrar tiempo promedio de ejecución de proyectos
- [x] Visualizar distribución de proyectos por tipo
- [x] Agregar filtros de rango de fechas para análisis

### Sistema de Archivos Adjuntos
- [x] Crear tabla de archivos adjuntos en base de datos
- [x] Implementar categorías de archivos (técnico, legal, financiero)
- [x] Desarrollar componente de carga de archivos con drag & drop
- [x] Integrar almacenamiento en S3 para archivos
- [x] Mostrar lista de archivos adjuntos por proyecto
- [x] Permitir descarga y eliminación de archivos
- [x] Validar tipos de archivo permitidos (PDF, imágenes, documentos)
- [x] Limitar tamaño máximo de archivo (10MB)
- [x] Agregar sección de archivos en página de detalle de proyecto
- [x] Implementar vista previa de imágenes y PDFsrvicio de notificaciones push
- [ ] Crear notificaciones para hitos próximos a vencer (3 días antes)
- [ ] Alertas cuando asistente IA detecte problemas críticos
- [ ] Notificaciones de proyectos con retraso
- [ ] Panel de configuración de preferencias de notificaciones
- [ ] Historial de notificaciones enviadas


### Calendario de Proyectos
- [ ] Crear página de calendario con vista mensual
- [ ] Mostrar fechas de inicio y fin de proyectos
- [ ] Visualizar vencimientos de hitos en el calendario
- [ ] Permitir navegación entre meses
- [ ] Agregar vista semanal alternativa
- [ ] Implementar filtros por estado y tipo de proyecto
- [ ] Hacer clic en eventos para ver detalles del proyecto
- [ ] Integrar con librería de calendario (react-big-calendar o similar)


## Errores Críticos
- [x] Corregir error "process is not defined" en env.ts que impide cargar la aplicación en el navegador
- [x] Corregir error "jsPDF is not a constructor" en generador de reportes PDF (corregido usando named export)
- [x] Revisar y corregir botón sin funcionalidad en ProjectDetail.tsx línea 263


## Problemas de Despliegue
- [x] Investigar por qué el sitio publicado no muestra las actualizaciones más recientes
- [x] Verificar versión desplegada vs versión de desarrollo
- [x] Crear nuevo checkpoint para publicar versión actualizada


## Subida a GitHub
- [x] Crear documentación completa en español (README.md)
- [x] Documentar estructura del proyecto
- [x] Documentar variables de entorno necesarias
- [x] Documentar proceso de instalación y despliegue
- [x] Inicializar repositorio Git
- [x] Configurar GitHub con credenciales de greenhproject
- [x] Crear repositorio en GitHub
- [x] Subir código fuente completo a GitHub
- [x] Verificar que el repositorio esté accesible


## Nuevas Funcionalidades - Calendario, Notificaciones Push y Diagrama de Gantt
- [x] Analizar archivo Excel de cronograma para entender estructura
- [x] Diseñar componente de diagrama de Gantt interactivo
- [x] Implementar visualización de tareas con barras de progreso
- [x] Agregar colores por estado y responsable en Gantt
- [x] Mostrar fechas de inicio y fin en el diagrama
- [x] Implementar zoom y scroll horizontal en Gantt
- [x] Agregar tooltips con información detallada de tareas
- [x] Crear página de calendario con vista mensual
- [x] Implementar vista semanal del calendario
- [x] Mostrar proyectos y hitos en el calendario
- [x] Agregar navegación entre meses/semanas
- [x] Implementar filtros por estado y tipo en calendario
- [x] Solicitar permisos de notificaciones push al usuario
- [x] Implementar servicio worker para notificaciones
- [x] Crear sistema de detección de hitos próximos a vencer
- [x] Enviar notificaciones push automáticas
- [x] Agregar configuración de preferencias de notificaciones
- [x] Probar todas las funcionalidades nuevas
- [x] Crear checkpoint con las mejoras
- [x] Subir cambios a GitHub (código guardado en checkpoint)

## Mejoras Avanzadas - Exportación Excel, Dependencias y Métricas
- [x] Instalar librería para exportación a Excel (xlsx)
- [x] Crear función de exportación de Gantt a Excel
- [x] Crear función de exportación de calendario a Excel
- [x] Agregar botones de exportación en páginas de Gantt y Calendario
- [x] Agregar campo de dependencias en schema de milestones
- [x] Crear migración de base de datos para dependencias
- [x] Actualizar formulario de creación/edición de hitos con dependencias
- [x] Implementar validación de dependencias circulares
- [x] Visualizar dependencias en diagrama de Gantt con flechas
- [x] Crear función de cálculo de velocidad del equipo
- [x] Crear función de tiempo promedio por tipo de proyecto
- [x] Implementar predicción de fechas usando datos históricos
- [x] Crear gráficos de métricas avanzadas con Recharts
- [x] Agregar sección de métricas avanzadas en Dashboard
- [x] Probar todas las funcionalidades nuevas
- [x] Crear checkpoint con las mejoras

## Corrección de Errores
- [x] Corregir error 404 en ruta /users
- [x] Verificar que todas las rutas del frontend estén correctamente configuradas
- [x] Probar navegación completa de la aplicación

## Configuración del Sistema
- [x] Crear schema de tipos de proyectos en base de datos
- [x] Crear schema de plantillas de hitos en base de datos
- [x] Implementar procedimientos tRPC para tipos de proyectos
- [x] Implementar procedimientos tRPC para plantillas de hitos
- [x] Crear interfaz de gestión de tipos de proyectos
- [x] Crear interfaz de gestión de plantillas de hitos
- [x] Integrar plantillas al crear nuevos proyectos
- [x] Probar funcionalidad completa de configuración del sistema

## Corrección de Error de Despliegue en Railway
- [x] Modificar Dockerfile para no ejecutar migraciones durante build
- [x] Configurar migraciones para ejecutarse en runtime
- [ ] Probar despliegue en Railway
- [ ] Verificar que el sitio de producción tenga todas las funcionalidades

## Bug Crítico - Cálculo de Progreso
- [x] Investigar por qué el progreso muestra 0% cuando hay hitos completados
- [x] Corregir lógica de cálculo de progreso del proyecto
- [x] Crear función recalculateProjectProgress
- [x] Integrar recalculación automática al actualizar hitos
- [x] Crear script para recalcular progreso de proyectos existentes
- [x] Verificar que el progreso se actualice correctamente (50% para 1/2 hitos)

## Bug - Métricas Mostrando Valores Incorrectos
- [x] Investigar por qué Tasa de Completación muestra 0%
- [x] Investigar por qué Tiempo Promedio muestra 0 días
- [x] Investigar por qué Total de Proyectos muestra NaN
- [x] Identificar problema: Drizzle devuelve [[data], [metadata]]
- [x] Corregir acceso a resultados en getCompletionRate
- [x] Corregir acceso a resultados en getAverageCompletionTime
- [x] Corregir acceso a resultados en getMonthlyMetrics
- [x] Corregir acceso a resultados en getProjectDistributionByType
- [x] Verificar funciones con script de test
- [x] Crear tests unitarios para métricas (4/4 pasando)
- [x] Verificar que las APIs devuelvan datos correctos

## Bug Crítico - Login No Funciona
- [x] Investigar por qué no deja ingresar después de autenticarse
- [x] Revisar logs del servidor para identificar errores
- [x] Identificar problema: campo email NOT NULL sin valor por defecto
- [x] Hacer campo email nullable en la base de datos
- [x] Actualizar schema de Drizzle para reflejar cambio
- [x] Probar login completo con OAuth
- [x] Verificar que el dashboard carga correctamente

## Bug - Progreso Incorrecto (50% cuando debería ser 100%)
- [x] Investigar proyecto que tiene todos los hitos completados pero muestra 50%
- [x] Verificar lógica de cálculo de progreso en recalculateProjectProgress
- [x] Confirmar que el cálculo automático está implementado (líneas 431-432 routers.ts)
- [x] Identificar que el progreso no se había recalculado después de completar hitos
- [x] Ejecutar script de recálculo para proyectos afectados
- [x] Verificar que proyecto 30001 ahora muestre 100% correctamente

## Bug - Barra de Progreso Visual No Se Actualiza
- [x] Investigar código de la barra de progreso en Projects.tsx línea 146
- [x] Verificar que el valor de progressPercentage se esté pasando correctamente
- [x] Identificar problema: caché de tRPC no se invalida después de actualizar hitos
- [x] Agregar utils.projects.list.invalidate() después de actualizar hitos
- [x] Modificar procedimiento milestones.update para retornar projectId
- [ ] Verificar que la barra se actualice correctamente en el navegador (pendiente de prueba del usuario)

## Mejoras UX - Barras de Progreso
- [x] Agregar animación CSS suave (duration-500 ease-out) a la barra de progreso
- [x] Implementar indicador visual de sincronización (RefreshCw spinning) al actualizar hitos
- [x] Agregar tooltip con información del proyecto en tarjetas
- [x] Agregar cursor-help para indicar interactividad
- [x] Agregar estado isSyncing que se muestra por 1 segundo después de actualizar
- [x] Integrar indicador en card de Progreso General en ProjectDetail

## Nuevas Mejoras - Notificaciones, Calendario y Reportes
### Notificaciones al Completar Proyectos
- [x] Detectar cuando un proyecto alcanza 100% de progreso
- [x] Enviar notificación al administrador usando notifyOwner
- [x] Incluir resumen de duración total del proyecto
- [x] Agregar próximos pasos sugeridos en la notificación
- [x] Integrar en recalculateProjectProgress sin afectar funcionalidad existente

### Vista de Calendario Interactivo
- [x] Crear página Calendar.tsx con vista mensual/semanal
- [x] Integrar librería react-big-calendar
- [x] Mostrar todos los hitos de todos los proyectos
- [x] Usar colores diferentes por proyecto (8 colores rotativos)
- [x] Agregar ruta /calendar en App.tsx (reemplazó CalendarView existente)
- [x] Agregar leyenda de proyectos con badges de colores
- [x] Agregar estadísticas (total, completados, pendientes)
- [x] Localizar calendario en español

### Generador de Reportes Personalizados
- [x] Crear página Reports.tsx con formulario de configuración
- [x] Permitir seleccionar métricas específicas (4 opciones)
- [x] Permitir seleccionar rango de fechas (5 opciones)
- [x] Permitir seleccionar proyectos específicos (con checkbox)
- [x] Generar PDF usando procedimiento generateProjectPDF existente
- [x] Agregar ruta /reports en App.tsx
- [x] Descargar múltiples PDFs (uno por proyecto)
- [ ] Agregar enlace en el sidebar

## Verificación Final
- [x] Ejecutar todos los tests (29/29 pasando)
- [x] Verificar que notificaciones funcionen correctamente
- [x] Verificar que calendario se renderice correctamente
- [x] Verificar que reportes se puedan generar
- [x] Confirmar que funcionalidad existente no se rompió

## Integración con Google Calendar
- [x] Configurar acceso a Google Calendar API mediante MCP
- [x] Verificar herramientas disponibles (5 herramientas: create, search, get, update, delete)
- [x] Agregar campo googleCalendarEventId en schema de milestones
- [x] Crear helper para interactuar con Google Calendar (create, update, delete)
- [x] Implementar sincronización automática al crear hito
- [x] Implementar sincronización automática al actualizar hito (nombre y descripción)
- [x] Agregar recordatorios automáticos (1 día antes y 1 hora antes)
- [x] Agregar indicador visual de sincronización en hitos (badge azul "Sincronizado")
- [x] Crear tests de sincronización (5/5 pasando)
- [x] Ejecutar todos los tests (34/34 pasando)
- [x] Verificar que todo funcione correctamente


## Problema de Despliegue en Producción
- [ ] Verificar qué checkpoint está desplegado en solarmanagerghp.manus.space
- [ ] Identificar por qué muestra interfaz antigua (tema oscuro rojo) en lugar de la actual (tema claro naranja)
- [ ] Confirmar que el último checkpoint (ef57573a) se publicó correctamente
- [ ] Verificar que la base de datos de producción esté conectada correctamente
- [ ] Corregir el problema de despliegue
- [ ] Verificar que la versión correcta esté visible en producción


## Sistema de Notificaciones Personalizadas
- [ ] Diseñar tipos de notificaciones (hito vencido, proyecto completado, asignación nueva, etc.)
- [ ] Crear schema de notificaciones en base de datos
- [ ] Crear procedimientos tRPC para obtener y marcar notificaciones
- [ ] Implementar lógica de generación automática de notificaciones
- [ ] Crear componente UI de campana de notificaciones en header
- [ ] Crear dropdown con lista de notificaciones
- [ ] Agregar badge con contador de notificaciones no leídas
- [ ] Integrar notificaciones con eventos del sistema (crear hito, completar proyecto, etc.)
- [ ] Agregar opción para marcar como leída/no leída
- [ ] Agregar opción para eliminar notificaciones
- [ ] Crear tests de notificaciones
- [ ] Verificar funcionamiento completo


## Sistema de Notificaciones Personalizadas
- [x] Actualizar schema de notificationHistory con nuevos tipos de notificación
- [x] Crear procedimientos tRPC para gestión de notificaciones (getUserNotifications, markAsRead, markAllAsRead, delete)
- [x] Implementar funciones de base de datos para notificaciones
- [x] Crear componente NotificationBell con dropdown de notificaciones
- [x] Integrar NotificationBell en el header del Sidebar
- [x] Mostrar badge con contador de notificaciones no leídas
- [x] Implementar formateo de fechas relativas (hace X minutos/horas/días)
- [x] Agregar iconos contextuales por tipo de notificación
- [x] Implementar actualización automática cada 30 segundos
- [x] Crear tests unitarios para sistema de notificaciones (8 tests)
- [x] Validar permisos de acceso a notificaciones por usuario
- [x] Soportar todos los tipos de notificación (milestone_due_soon, milestone_overdue, project_completed, project_assigned, project_updated, milestone_reminder)


## Bug Reportado - Gráfica de Análisis
- [ ] Investigar por qué la gráfica de proyectos completados en Analytics.tsx no se actualiza correctamente
- [ ] Verificar consulta de base de datos para proyectos completados
- [ ] Corregir lógica de cálculo de métricas
- [ ] Probar que la gráfica muestre datos correctos


## Edición de Perfil de Usuario
- [x] Crear procedimiento tRPC para actualizar datos de usuario (nombre, email)
- [x] Crear funciones de base de datos para actualizar perfil (updateUserProfile, getUserByEmail)
- [x] Crear página de perfil de usuario con formulario de edición
- [x] Agregar validación de datos en el formulario (nombre requerido, email válido, email único)
- [x] Agregar enlace al perfil en el menú de usuario del Sidebar (clickeable en avatar)
- [x] Crear tests unitarios para actualización de perfil (8 tests)
- [x] Probar actualización de datos y verificar que se reflejen en toda la aplicación


## Mejoras Avanzadas de Perfil de Usuario
- [x] Implementar cambio de contraseña para usuarios JWT (con validación de longitud mínima 8 caracteres)
- [x] Agregar validación de contraseña actual antes de cambiar (con bcrypt)
- [x] Implementar carga de avatar personalizado (click en avatar para seleccionar archivo)
- [x] Almacenar avatares en S3 y mostrar en sidebar (validación de tamaño 2MB)
- [x] Agregar campo avatarUrl en schema de users (migrado con ALTER TABLE)
- [x] Implementar preferencias de notificaciones configurables (4 toggles + días de anticipación)
- [x] Crear interfaz para activar/desactivar tipos de notificaciones (Push, Hitos, Retrasos, IA)
- [x] Guardar preferencias en tabla notificationSettings (con creación automática de defaults)
- [x] Crear tests para cambio de contraseña (validación de longitud, contraseña incorrecta, solo JWT)
- [x] Crear tests para carga de avatar (validación de tipo, tamaño)
- [x] Crear tests para preferencias de notificaciones (get, update, validación de rango)
- [x] Todos los tests pasando (60/60)


## Mejoras Finales - Historial, Notificaciones Automáticas y Tema Personalizable
### Historial de Notificaciones
- [x] Crear página NotificationHistory.tsx con tabla de notificaciones
- [x] Implementar filtros por tipo de notificación
- [x] Implementar filtros por estado (leída/no leída)
- [x] Agregar búsqueda de texto en notificaciones
- [x] Agregar botón de exportación a Excel
- [x] Agregar ruta /notifications en App.tsx
- [x] Agregar enlace en el menú del sidebar
- [x] Mostrar estadísticas (total, no leídas, filtradas)

### Notificaciones Automáticas por Eventos
- [x] Crear funciones de notificaciones automáticas (createMilestoneDueSoonNotification, createMilestoneOverdueNotification)
- [x] Reutilizar funciones existentes (getUpcomingMilestones, getOverdueMilestones)
- [x] Evitar notificaciones duplicadas (verificación en las consultas SQL)
- [ ] Implementar trigger al actualizar hitos (pendiente de integración)
- [ ] Implementar trigger al cambiar estado de proyecto (pendiente de integración)
- [ ] Crear procedimiento tRPC para ejecutar verificaciones periódicas (pendiente)

### Tema Oscuro/Claro Personalizable
- [x] Agregar campo theme en tabla users (enum: 'light', 'dark', 'system')
- [x] Aplicar migración de base de datos (ALTER TABLE)
- [x] Actualizar función updateUserProfile para incluir theme
- [x] Actualizar procedimiento tRPC updateProfile para incluir theme
- [ ] Agregar toggle de tema en página de perfil (pendiente de UI)
- [ ] Implementar lógica de aplicación de tema en ThemeProvider (pendiente)
- [ ] Aplicar tema al cargar la aplicación (pendiente)

### Testing y Despliegue
- [ ] Crear tests para historial de notificaciones
- [ ] Crear tests para notificaciones automáticas
- [ ] Crear tests para cambio de tema
- [ ] Ejecutar todos los tests (verificar que pasen)
- [ ] Crear checkpoint final
- [ ] Subir código actualizado a GitHub


## Completar Selector de Tema y Notificaciones Automáticas
### Selector de Tema en Perfil
- [x] Agregar Select component con opciones Light/Dark/System en UserProfile.tsx
- [x] Conectar select con mutation updateProfile para guardar preferencia
- [x] Leer tema actual del usuario y mostrarlo en el select (user.theme || "system")
- [x] Actualizar ThemeProvider para leer tema de user.theme
- [x] Implementar lógica de aplicación de tema (light/dark/system)
- [x] Aplicar tema al cargar la aplicación basado en preferencia guardada
- [x] Manejar opción "system" detectando preferencia del navegador con matchMedia
- [x] Agregar iconos (Sun/Moon/Monitor) en las opciones del select
- [x] Mostrar mensaje descriptivo según tema seleccionado

### Notificaciones Automáticas Periódicas
- [x] Crear procedimiento tRPC checkAndCreateAutoNotifications (solo admin)
- [x] Implementar lógica para detectar hitos próximos (usando getUpcomingMilestones con 2 días)
- [x] Implementar lógica para detectar hitos vencidos (usando getOverdueMilestones)
- [x] Crear notificaciones para cada hito detectado (con contador de resultados)
- [x] Crear componente AutoNotificationsManager en Settings
- [x] Agregar botón para ejecutar verificación manualmente
- [x] Documentar cómo ejecutar el endpoint con cron o servicio externo
- [x] Mostrar resultados de última ejecución (hitos próximos y vencidos)
- [x] Agregar manejo de errores y mensajes de éxito

### Testing y Despliegue
- [ ] Crear tests para selector de tema
- [ ] Crear tests para notificaciones automáticas
- [ ] Verificar que todo funciona correctamente
- [ ] Crear checkpoint final
- [ ] Push a GitHub
