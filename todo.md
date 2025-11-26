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
