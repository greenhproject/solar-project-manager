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

## Integración con OpenSolar API
- [x] Investigar documentación de API de OpenSolar
- [x] Crear procedimiento tRPC para obtener datos de proyecto desde OpenSolar
- [x] Implementar campo de ID de OpenSolar en formulario
- [x] Agregar función de autocompletado al escribir ID
- [x] Mapear campos de OpenSolar a campos del formulario
- [x] Manejar errores de API (ID inválido, proyecto no encontrado)
- [x] Probar integración completa
