# Solar Project Manager - GreenH Project

**Aplicación web completa para la gestión integral de proyectos de energía solar**

## 📋 Descripción

Solar Project Manager es una plataforma full-stack diseñada específicamente para GreenH Project, que permite gestionar proyectos de instalación de sistemas de energía solar desde la planificación hasta la entrega final. La aplicación incluye seguimiento de hitos, asignación de ingenieros, generación de reportes PDF, integración con OpenSolar API, y un asistente de IA para análisis y sugerencias de mejora.

## ✨ Características Principales

### Gestión de Proyectos

- **Creación y edición de proyectos** solares con información detallada (cliente, ubicación, capacidad, fechas)
- **Tipos de proyecto configurables**: Residencial, Comercial, Industrial, Agrícola, Comunitario
- **Estados de proyecto**: Planificación, En Progreso, Completado, En Espera, Cancelado
- **Asignación de ingenieros** responsables por proyecto
- **Vinculación con OpenSolar** mediante ID de proyecto externo

### Sistema de Hitos (Milestones)

- **Plantillas de hitos** predefinidas por tipo de proyecto
- **Hitos personalizados** para necesidades específicas
- **Seguimiento de progreso** con cálculo automático de porcentaje de avance
- **Estados de hitos**: Pendiente, En Progreso, Completado, Retrasado
- **Fechas de vencimiento** con alertas automáticas

### Gestión de Usuarios y Roles

- **Autenticación OAuth** mediante Manus
- **Dos roles**: Administrador y Ingeniero
- **Usuario maestro**: `greenhproject@gmail.com` (administrador permanente, no modificable)
- **Registro por defecto**: Nuevos usuarios se registran como "Ingeniero"
- **Gestión de usuarios**: Los administradores pueden cambiar roles y eliminar usuarios

### Dashboard y Análiticas

- **Dashboard principal** con estadísticas en tiempo real:
  - Total de proyectos
  - Proyectos en progreso
  - Proyectos completados
  - Proyectos con retraso
- **Página de Analytics** con gráficos avanzados:
  - Evolución temporal de proyectos por mes (gráfico de línea)
  - Distribución de proyectos por tipo (gráfico de pastel)
  - Tasa de completación y tiempo promedio de ejecución
  - Filtros por rango de fechas

### Sistema de Recordatorios

- **Recordatorios automáticos** para hitos próximos a vencer
- **Recordatorios manuales** personalizados
- **Notificaciones en dashboard** con indicador de no leídos
- **Marcar como leído** para gestionar recordatorios

### Generación de Reportes PDF

- **Reportes ejecutivos** profesionales en formato PDF
- **Información incluida**:
  - Datos del proyecto (nombre, cliente, fechas, capacidad)
  - Progreso general con porcentaje de avance
  - Lista detallada de hitos con estados
  - Gráfico de progreso visual
  - Métricas clave (hitos completados, pendientes, retrasados)
- **Descarga directa** desde la página de detalle del proyecto

### Integración con OpenSolar API

- **Sincronización de proyectos** desde OpenSolar
- **Actualización automática** de datos de proyectos
- **Registro de logs** de sincronización con timestamps
- **Manejo de errores** y reintentos automáticos
- **Botón de sincronización manual** para forzar actualización

### Asistente de IA

- **Análisis inteligente** de todos los proyectos del sistema
- **Detección de problemas** y cuellos de botella
- **Sugerencias de mejora** personalizadas
- **Chat interactivo** para consultas específicas
- **Predicción de riesgos** y retrasos potenciales

### Sistema de Archivos Adjuntos

- **Carga de documentos** con drag-and-drop
- **Categorías**: Técnico, Legal, Financiero, Otro
- **Tipos soportados**: PDF, imágenes (JPG, PNG), documentos de Office
- **Almacenamiento en S3** con URLs públicas
- **Límite de tamaño**: 10MB por archivo
- **Vista previa** de imágenes y PDFs
- **Descarga y eliminación** de archivos

### Diseño y UX

- **Diseño moderno** tipo Apple con sombras suaves y bordes redondeados
- **Paleta de colores solar**: Naranjas y ámbar (#FF6B35, #F7B32B)
- **Tipografía**: Fuente Inter (similar a San Francisco)
- **Menú lateral colapsable** para ahorrar espacio en pantalla
- **Completamente responsive** para móviles y tablets
- **Tema oscuro** por defecto con colores optimizados

## 🛠️ Tecnologías Utilizadas

### Frontend

- **React 19** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático para JavaScript
- **Tailwind CSS 4** - Framework de estilos utility-first
- **shadcn/ui** - Componentes de UI modernos y accesibles
- **Wouter** - Enrutamiento ligero para React
- **tRPC** - Cliente type-safe para comunicación con el backend
- **TanStack Query** - Gestión de estado del servidor y caché
- **Recharts** - Biblioteca de gráficos para visualizaciones
- **Lucide React** - Iconos modernos y consistentes
- **React Hook Form** - Gestión de formularios con validación
- **Zod** - Validación de esquemas TypeScript-first

### Backend

- **Node.js 22** - Entorno de ejecución JavaScript
- **Express 4** - Framework web minimalista
- **tRPC 11** - API type-safe end-to-end
- **Drizzle ORM** - ORM TypeScript-first para MySQL/TiDB
- **MySQL/TiDB** - Base de datos relacional
- **jsPDF** - Generación de documentos PDF
- **Superjson** - Serialización avanzada (mantiene tipos Date, etc.)
- **Jose** - Manejo de JWT para autenticación
- **Axios** - Cliente HTTP para integraciones externas

### Infraestructura y Servicios

- **Manus OAuth** - Autenticación de usuarios
- **AWS S3** - Almacenamiento de archivos adjuntos
- **OpenAI API** - Asistente de IA (vía Manus LLM)
- **Vite** - Build tool y dev server ultra-rápido
- **Vitest** - Framework de testing unitario
- **pnpm** - Gestor de paquetes eficiente

## 📁 Estructura del Proyecto

```
solar-project-manager/
├── client/                      # Aplicación frontend (React)
│   ├── public/                  # Archivos estáticos
│   └── src/
│       ├── components/          # Componentes reutilizables
│       │   ├── ui/             # Componentes de shadcn/ui
│       │   ├── Sidebar.tsx     # Menú lateral colapsable
│       │   ├── MainLayout.tsx  # Layout principal con sidebar
│       │   ├── FileUpload.tsx  # Componente de carga de archivos
│       │   └── FileList.tsx    # Lista de archivos adjuntos
│       ├── pages/              # Páginas de la aplicación
│       │   ├── Home.tsx        # Página de inicio/landing
│       │   ├── Dashboard.tsx   # Dashboard principal
│       │   ├── Projects.tsx    # Listado de proyectos
│       │   ├── NewProject.tsx  # Formulario de nuevo proyecto
│       │   ├── ProjectDetail.tsx # Detalle y gestión de proyecto
│       │   ├── Analytics.tsx   # Página de métricas avanzadas
│       │   ├── Reminders.tsx   # Gestión de recordatorios
│       │   ├── AIAssistant.tsx # Asistente de IA
│       │   ├── UserManagement.tsx # Gestión de usuarios (admin)
│       │   └── Settings.tsx    # Configuración
│       ├── lib/                # Utilidades y configuración
│       │   ├── trpc.ts         # Cliente tRPC
│       │   └── notifications.ts # Helper de notificaciones
│       ├── contexts/           # Contextos de React
│       ├── hooks/              # Custom hooks
│       ├── App.tsx             # Componente raíz con rutas
│       ├── main.tsx            # Punto de entrada
│       └── index.css           # Estilos globales y tema
├── server/                      # Aplicación backend (Node.js + Express)
│   ├── _core/                  # Funcionalidad del framework
│   │   ├── index.ts           # Servidor Express principal
│   │   ├── context.ts         # Contexto de tRPC (usuario, req, res)
│   │   ├── trpc.ts            # Configuración de tRPC
│   │   ├── env.ts             # Variables de entorno
│   │   ├── llm.ts             # Helper de integración LLM
│   │   ├── map.ts             # Helper de Google Maps
│   │   └── notification.ts    # Helper de notificaciones
│   ├── db.ts                   # Funciones de base de datos
│   ├── routers.ts              # Definición de routers tRPC
│   ├── pdfGenerator.ts         # Generación de reportes PDF
│   ├── openSolarIntegration.ts # Integración con OpenSolar API
│   ├── storage.ts              # Helpers de almacenamiento S3
│   ├── *.test.ts              # Tests unitarios (Vitest)
│   └── ...
├── drizzle/                     # Esquema y migraciones de base de datos
│   └── schema.ts               # Definición de tablas
├── shared/                      # Código compartido entre cliente y servidor
│   └── const.ts                # Constantes compartidas
├── package.json                # Dependencias y scripts
├── tsconfig.json               # Configuración de TypeScript
├── vite.config.ts              # Configuración de Vite
├── tailwind.config.ts          # Configuración de Tailwind CSS
├── todo.md                     # Lista de tareas del proyecto
└── README.md                   # Este archivo
```

## 🗄️ Esquema de Base de Datos

### Tabla: `users`

Almacena información de usuarios registrados.

| Campo        | Tipo         | Descripción                            |
| ------------ | ------------ | -------------------------------------- |
| id           | int (PK, AI) | ID único del usuario                   |
| openId       | varchar(64)  | ID de OAuth de Manus (único)           |
| name         | text         | Nombre completo del usuario            |
| email        | varchar(320) | Correo electrónico                     |
| loginMethod  | varchar(64)  | Método de login (google, github, etc.) |
| role         | enum         | Rol: 'admin' o 'user' (ingeniero)      |
| createdAt    | timestamp    | Fecha de creación                      |
| updatedAt    | timestamp    | Fecha de última actualización          |
| lastSignedIn | timestamp    | Fecha del último inicio de sesión      |

### Tabla: `project_types`

Define los tipos de proyectos solares disponibles.

| Campo             | Tipo         | Descripción                         |
| ----------------- | ------------ | ----------------------------------- |
| id                | int (PK, AI) | ID único del tipo                   |
| name              | varchar(100) | Nombre del tipo (ej: "Residencial") |
| description       | text         | Descripción detallada               |
| defaultMilestones | text         | JSON con plantilla de hitos         |
| createdAt         | timestamp    | Fecha de creación                   |

### Tabla: `projects`

Almacena los proyectos solares.

| Campo              | Tipo         | Descripción                                                            |
| ------------------ | ------------ | ---------------------------------------------------------------------- |
| id                 | int (PK, AI) | ID único del proyecto                                                  |
| name               | varchar(255) | Nombre del proyecto                                                    |
| client             | varchar(255) | Nombre del cliente                                                     |
| location           | text         | Ubicación del proyecto                                                 |
| capacity           | int          | Capacidad en kW                                                        |
| projectTypeId      | int (FK)     | Referencia a project_types                                             |
| assignedEngineerId | int (FK)     | Referencia a users (ingeniero asignado)                                |
| status             | enum         | Estado: 'planning', 'in_progress', 'completed', 'on_hold', 'cancelled' |
| startDate          | timestamp    | Fecha de inicio estimada                                               |
| endDate            | timestamp    | Fecha de fin estimada                                                  |
| actualEndDate      | timestamp    | Fecha real de finalización                                             |
| openSolarId        | varchar(255) | ID del proyecto en OpenSolar                                           |
| notes              | text         | Notas adicionales                                                      |
| createdAt          | timestamp    | Fecha de creación                                                      |
| updatedAt          | timestamp    | Fecha de última actualización                                          |

### Tabla: `milestones`

Hitos/etapas de cada proyecto.

| Campo         | Tipo         | Descripción                                              |
| ------------- | ------------ | -------------------------------------------------------- |
| id            | int (PK, AI) | ID único del hito                                        |
| projectId     | int (FK)     | Referencia a projects                                    |
| name          | varchar(255) | Nombre del hito                                          |
| description   | text         | Descripción detallada                                    |
| status        | enum         | Estado: 'pending', 'in_progress', 'completed', 'delayed' |
| dueDate       | timestamp    | Fecha de vencimiento                                     |
| completedDate | timestamp    | Fecha de completación real                               |
| order         | int          | Orden de visualización                                   |
| createdAt     | timestamp    | Fecha de creación                                        |

### Tabla: `reminders`

Recordatorios para hitos y proyectos.

| Campo       | Tipo         | Descripción                        |
| ----------- | ------------ | ---------------------------------- |
| id          | int (PK, AI) | ID único del recordatorio          |
| projectId   | int (FK)     | Referencia a projects              |
| milestoneId | int (FK)     | Referencia a milestones (opcional) |
| userId      | int (FK)     | Referencia a users (destinatario)  |
| message     | text         | Mensaje del recordatorio           |
| dueDate     | timestamp    | Fecha de vencimiento               |
| isRead      | boolean      | Si fue leído                       |
| createdAt   | timestamp    | Fecha de creación                  |

### Tabla: `project_updates`

Historial de actualizaciones de proyectos.

| Campo       | Tipo         | Descripción                                                         |
| ----------- | ------------ | ------------------------------------------------------------------- |
| id          | int (PK, AI) | ID único de la actualización                                        |
| projectId   | int (FK)     | Referencia a projects                                               |
| userId      | int (FK)     | Usuario que realizó la actualización                                |
| updateType  | enum         | Tipo: 'status_change', 'milestone_completed', 'note_added', 'other' |
| description | text         | Descripción de la actualización                                     |
| createdAt   | timestamp    | Fecha de creación                                                   |

### Tabla: `sync_logs`

Logs de sincronización con OpenSolar.

| Campo     | Tipo         | Descripción                                      |
| --------- | ------------ | ------------------------------------------------ |
| id        | int (PK, AI) | ID único del log                                 |
| projectId | int (FK)     | Referencia a projects (opcional)                 |
| syncType  | enum         | Tipo: 'full_sync', 'project_sync', 'manual_sync' |
| status    | enum         | Estado: 'success', 'failed', 'partial'           |
| message   | text         | Mensaje de resultado                             |
| syncedBy  | int (FK)     | Usuario que inició la sincronización             |
| createdAt | timestamp    | Fecha de sincronización                          |

### Tabla: `project_attachments`

Archivos adjuntos a proyectos.

| Campo      | Tipo         | Descripción                                           |
| ---------- | ------------ | ----------------------------------------------------- |
| id         | int (PK, AI) | ID único del archivo                                  |
| projectId  | int (FK)     | Referencia a projects                                 |
| fileName   | varchar(255) | Nombre original del archivo                           |
| fileKey    | varchar(500) | Clave del archivo en S3                               |
| fileUrl    | text         | URL pública del archivo                               |
| fileSize   | int          | Tamaño en bytes                                       |
| mimeType   | varchar(100) | Tipo MIME del archivo                                 |
| category   | enum         | Categoría: 'technical', 'legal', 'financial', 'other' |
| uploadedBy | int (FK)     | Usuario que subió el archivo                          |
| createdAt  | timestamp    | Fecha de subida                                       |

### Tabla: `notification_settings`

Configuración de notificaciones por usuario.

| Campo              | Tipo         | Descripción                               |
| ------------------ | ------------ | ----------------------------------------- |
| id                 | int (PK, AI) | ID único de configuración                 |
| userId             | int (FK)     | Referencia a users                        |
| milestoneReminders | boolean      | Activar recordatorios de hitos            |
| projectUpdates     | boolean      | Activar notificaciones de actualizaciones |
| aiAlerts           | boolean      | Activar alertas del asistente IA          |
| reminderDays       | int          | Días de anticipación para recordatorios   |
| createdAt          | timestamp    | Fecha de creación                         |
| updatedAt          | timestamp    | Fecha de última actualización             |

### Tabla: `notification_history`

Historial de notificaciones enviadas.

| Campo              | Tipo         | Descripción                                                    |
| ------------------ | ------------ | -------------------------------------------------------------- |
| id                 | int (PK, AI) | ID único de notificación                                       |
| userId             | int (FK)     | Referencia a users                                             |
| type               | enum         | Tipo: 'milestone_due', 'project_delayed', 'ai_alert', 'manual' |
| title              | varchar(255) | Título de la notificación                                      |
| message            | text         | Mensaje de la notificación                                     |
| relatedProjectId   | int (FK)     | Proyecto relacionado (opcional)                                |
| relatedMilestoneId | int (FK)     | Hito relacionado (opcional)                                    |
| sentAt             | timestamp    | Fecha de envío                                                 |

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js 22 o superior
- pnpm (gestor de paquetes)
- Base de datos MySQL o TiDB
- Cuenta de AWS S3 para almacenamiento de archivos
- Cuenta de Manus para OAuth y servicios LLM

### Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# Base de Datos
DATABASE_URL="mysql://usuario:contraseña@host:puerto/nombre_bd"

# Autenticación (proporcionadas automáticamente por Manus)
JWT_SECRET="tu_secreto_jwt"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://oauth.manus.im"
VITE_APP_ID="tu_app_id"

# Usuario Propietario (proporcionadas automáticamente por Manus)
OWNER_OPEN_ID="open_id_del_propietario"
OWNER_NAME="Nombre del Propietario"

# APIs de Manus (proporcionadas automáticamente)
BUILT_IN_FORGE_API_URL="https://forge.manus.im"
BUILT_IN_FORGE_API_KEY="tu_api_key_backend"
VITE_FRONTEND_FORGE_API_URL="https://forge.manus.im"
VITE_FRONTEND_FORGE_API_KEY="tu_api_key_frontend"

# OpenSolar (opcional, para integración)
OPENSOLAR_API_KEY="tu_api_key_opensolar"
OPENSOLAR_ORG_ID="tu_org_id_opensolar"

# Analytics (proporcionadas automáticamente por Manus)
VITE_ANALYTICS_ENDPOINT="https://analytics.manus.im"
VITE_ANALYTICS_WEBSITE_ID="tu_website_id"

# Configuración de la App
VITE_APP_TITLE="Solar Project Manager"
VITE_APP_LOGO="/logo.png"
```

### Instalación

1. **Clonar el repositorio**:

```bash
git clone https://github.com/greenhproject/solar-project-manager.git
cd solar-project-manager
```

2. **Instalar dependencias**:

```bash
pnpm install
```

3. **Configurar variables de entorno**:

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

4. **Ejecutar migraciones de base de datos**:

```bash
pnpm db:push
```

5. **Cargar datos iniciales** (tipos de proyecto):

```bash
npx tsx seed-data.mjs
```

### Desarrollo

Ejecutar el servidor de desarrollo:

```bash
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

### Producción

1. **Construir la aplicación**:

```bash
pnpm build
```

2. **Iniciar el servidor de producción**:

```bash
pnpm start
```

### Testing

Ejecutar tests unitarios:

```bash
pnpm test
```

## 📝 Scripts Disponibles

| Script         | Descripción                               |
| -------------- | ----------------------------------------- |
| `pnpm dev`     | Inicia el servidor de desarrollo          |
| `pnpm build`   | Construye la aplicación para producción   |
| `pnpm start`   | Inicia el servidor de producción          |
| `pnpm test`    | Ejecuta los tests unitarios               |
| `pnpm db:push` | Ejecuta migraciones de base de datos      |
| `pnpm check`   | Verifica tipos de TypeScript sin compilar |
| `pnpm format`  | Formatea el código con Prettier           |

## 🔐 Seguridad

### Autenticación y Autorización

- **OAuth 2.0** mediante Manus para autenticación segura
- **JWT** para mantener sesiones de usuario
- **Cookies HttpOnly** para almacenar tokens de sesión
- **Validación de roles** en cada procedimiento tRPC protegido
- **Usuario maestro inmutable**: `greenhproject@gmail.com` no puede cambiar su rol de admin

### Protección de Datos

- **Validación de entrada** con Zod en todos los endpoints
- **Sanitización de datos** antes de almacenar en base de datos
- **Encriptación de contraseñas** (manejada por Manus OAuth)
- **Variables de entorno** para secretos (nunca en código)

### Almacenamiento de Archivos

- **S3 con claves no enumerables** (sufijos aleatorios en nombres de archivo)
- **Validación de tipo MIME** antes de subir archivos
- **Límite de tamaño** de 10MB por archivo
- **URLs firmadas** para acceso temporal (opcional)

## 🎨 Personalización

### Colores del Tema

Los colores se definen en `client/src/index.css` usando variables CSS:

```css
:root {
  --primary: 24 100% 60%; /* Naranja solar #FF6B35 */
  --primary-foreground: 0 0% 100%; /* Blanco */
  --secondary: 42 95% 58%; /* Ámbar #F7B32B */
  /* ... más colores */
}
```

### Tipografía

La fuente Inter se carga desde Google Fonts en `client/index.html`:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Logo y Favicon

Reemplaza los archivos en `client/public/`:

- `logo.png` - Logo principal
- `favicon.ico` - Icono del navegador

## 📊 Uso de la Aplicación

### Para Administradores

1. **Gestión de Usuarios**:
   - Acceder a "Gestión de Usuarios" desde el menú lateral
   - Cambiar roles de usuarios (Admin/Ingeniero)
   - Eliminar usuarios (excepto usuario maestro)

2. **Creación de Proyectos**:
   - Hacer clic en "Nuevo Proyecto" desde Dashboard o Proyectos
   - Completar formulario con datos del proyecto
   - Asignar ingeniero responsable
   - Seleccionar tipo de proyecto (carga plantilla de hitos automáticamente)

3. **Configuración de Tipos de Proyecto**:
   - Editar `seed-data.mjs` para modificar tipos y plantillas de hitos
   - Ejecutar `npx tsx seed-data.mjs` para actualizar

### Para Ingenieros

1. **Ver Proyectos Asignados**:
   - Dashboard muestra proyectos asignados al ingeniero actual
   - Filtrar por estado en página de Proyectos

2. **Gestionar Hitos**:
   - Abrir detalle del proyecto
   - Marcar hitos como completados
   - Agregar hitos personalizados
   - Editar fechas de vencimiento

3. **Subir Archivos**:
   - En la pestaña "Archivos" del proyecto
   - Arrastrar y soltar archivos o hacer clic para seleccionar
   - Seleccionar categoría (Técnico, Legal, Financiero)
   - Descargar o eliminar archivos existentes

4. **Generar Reportes**:
   - En la pestaña "Resumen" del proyecto
   - Hacer clic en "Generar Reporte PDF"
   - El PDF se descarga automáticamente

5. **Consultar Asistente de IA**:
   - Acceder a "Asistente IA" desde el menú lateral
   - Hacer clic en "Analizar Proyectos" para obtener análisis general
   - Escribir preguntas específicas en el chat

## 🤝 Contribución

### Proceso de Desarrollo

1. Crear una rama para la nueva funcionalidad:

```bash
git checkout -b feature/nombre-funcionalidad
```

2. Realizar cambios y commits:

```bash
git add .
git commit -m "Descripción del cambio"
```

3. Subir cambios a GitHub:

```bash
git push origin feature/nombre-funcionalidad
```

4. Crear Pull Request en GitHub

### Estándares de Código

- **TypeScript**: Usar tipado estricto, evitar `any`
- **Nombres de variables**: camelCase para variables y funciones, PascalCase para componentes
- **Comentarios**: En español, explicando el "por qué" no el "qué"
- **Formato**: Usar Prettier (`pnpm format`)
- **Tests**: Escribir tests para nuevas funcionalidades críticas

## 🐛 Solución de Problemas

### El servidor no inicia

**Error**: `EADDRINUSE: address already in use`

**Solución**: Otro proceso está usando el puerto 3000. Matar el proceso:

```bash
lsof -ti:3000 | xargs kill -9
```

### Error de conexión a base de datos

**Error**: `ER_ACCESS_DENIED_ERROR`

**Solución**: Verificar credenciales en `DATABASE_URL` del archivo `.env`

### Archivos no se suben a S3

**Error**: `Access Denied` o `Invalid credentials`

**Solución**: Verificar que las variables de entorno de AWS S3 estén configuradas correctamente

### El asistente de IA no responde

**Error**: `API key not found` o `Rate limit exceeded`

**Solución**: Verificar `BUILT_IN_FORGE_API_KEY` en `.env` y verificar créditos de Manus

### El sitio publicado no se actualiza

**Problema**: Después de hacer "Publish", el sitio sigue mostrando versión anterior

**Solución**:

1. Crear un nuevo checkpoint desde la interfaz de Manus
2. Hacer clic en "Publish" y seleccionar el checkpoint más reciente
3. Limpiar caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
4. Esperar 1-2 minutos para que se complete el despliegue

## 📄 Licencia

Este proyecto es propiedad de **GreenH Project** y está destinado para uso interno de la empresa.

## 👥 Contacto

**GreenH Project**

- Email: greenhproject@gmail.com
- Sitio web: [Por definir]

## 🙏 Agradecimientos

- **Manus Platform** por la infraestructura de OAuth, LLM y hosting
- **shadcn/ui** por los componentes de interfaz
- **OpenSolar** por la API de integración de proyectos solares

---

**Versión**: 1.0.0  
**Última actualización**: 27 de noviembre de 2024  
**Desarrollado con** ❤️ **para GreenH Project**
