# Guía de Refactorización
## Solar Project Manager - GreenH Project

---

## Introducción

Este documento proporciona una guía detallada para refactorizar y mejorar el código del proyecto **Solar Project Manager**. Las mejoras propuestas están priorizadas y pueden implementarse de forma incremental sin romper la funcionalidad existente.

---

## Utilidades Compartidas Creadas

### ✅ Completado

Se han creado los siguientes archivos de utilidades compartidas en `/client/src/lib/utils/`:

#### 1. `projectUtils.ts`
Funciones reutilizables para gestión de proyectos:
- `getStatusBadgeConfig()`: Configuración de badges por estado
- `getMilestoneStatusBadgeConfig()`: Configuración de badges para hitos
- `getProjectStatusColor()`: Colores por estado
- `getProjectStatusText()`: Textos descriptivos
- `calculateProgress()`: Cálculo de porcentaje de progreso
- `isProjectDelayed()`: Detección de proyectos retrasados

**Uso:**
```typescript
import { getStatusBadgeConfig, isProjectDelayed } from '@/lib/utils';

const config = getStatusBadgeConfig('in_progress');
// { label: 'En Progreso', variant: 'default' }
```

#### 2. `dateUtils.ts`
Funciones para manejo de fechas:
- `isOverdue()`: Verifica si una fecha está vencida
- `isToday()`: Verifica si una fecha es hoy
- `formatDate()`: Formatea fechas en español
- `formatDateTime()`: Formatea fecha y hora
- `getRelativeTime()`: Distancia relativa ("hace 2 días")
- `getDaysUntil()`: Días hasta una fecha
- `isUpcoming()`: Verifica si una fecha está próxima
- `getDateAlertColor()`: Color de alerta por proximidad

**Uso:**
```typescript
import { isOverdue, formatDate, getRelativeTime } from '@/lib/utils';

if (isOverdue(milestone.dueDate)) {
  console.log('Hito vencido:', formatDate(milestone.dueDate));
}
```

#### 3. `fileUtils.ts`
Funciones para gestión de archivos:
- `getFileIcon()`: Icono apropiado por extensión
- `getFileColor()`: Color por tipo de archivo
- `isValidFileType()`: Validación de tipo
- `isValidFileSize()`: Validación de tamaño
- `formatFileSize()`: Formato legible de tamaño
- `isImageFile()`, `isPDFFile()`: Verificaciones específicas
- `generateUniqueFilename()`: Nombres únicos con timestamp

**Uso:**
```typescript
import { getFileIcon, formatFileSize, isValidFileType } from '@/lib/utils';

const Icon = getFileIcon('documento.pdf');
const size = formatFileSize(1024000); // "1 MB"
```

#### 4. `notificationUtils.ts`
Sistema consolidado de notificaciones (reemplaza `notifications.ts` y `pushNotifications.ts`):
- `areNotificationsSupported()`: Verifica soporte
- `areNotificationsEnabled()`: Verifica permisos
- `requestNotificationPermission()`: Solicita permisos
- `ensureNotificationPermission()`: Asegura permisos
- `showNotification()`: Muestra notificación genérica
- `notifyMilestoneDue()`: Notificación de hito próximo
- `notifyProjectDelayed()`: Notificación de retraso
- `notifyMilestoneCompleted()`: Notificación de completado
- `notifyAIIssue()`: Notificación de problema detectado por IA
- `notifyCustom()`: Notificación personalizada

**Uso:**
```typescript
import { ensureNotificationPermission, notifyMilestoneDue } from '@/lib/utils';

// Solicitar permisos
await ensureNotificationPermission();

// Mostrar notificación
notifyMilestoneDue('Instalación de paneles', 'Proyecto Solar ABC', 3, () => {
  // Callback al hacer clic
  navigate('/projects/123');
});
```

---

## Migración de Código Existente

### Paso 1: Reemplazar Funciones Duplicadas

#### En `Dashboard.tsx`, `Projects.tsx`, `ProjectDetail.tsx`:

**Antes:**
```typescript
function getStatusBadge(status: string) {
  // Código duplicado...
}

function isOverdue(date: Date) {
  // Código duplicado...
}
```

**Después:**
```typescript
import { getStatusBadgeConfig, isOverdue } from '@/lib/utils';

// Usar la configuración para crear el badge
const { label, variant } = getStatusBadgeConfig(project.status);
return <Badge variant={variant}>{label}</Badge>;

// Usar la función de fecha
if (isOverdue(milestone.dueDate)) {
  // ...
}
```

#### En `FileList.tsx` y `FileUpload.tsx`:

**Antes:**
```typescript
function getFileIcon(filename: string) {
  // Código duplicado...
}
```

**Después:**
```typescript
import { getFileIcon } from '@/lib/utils';

const Icon = getFileIcon(file.name);
return <Icon className="h-4 w-4" />;
```

#### En archivos de notificaciones:

**Antes:**
```typescript
import { requestNotificationPermission } from '@/lib/notifications';
import { notifyMilestoneDue } from '@/lib/pushNotifications';
```

**Después:**
```typescript
import { requestNotificationPermission, notifyMilestoneDue } from '@/lib/utils';
```

---

## Refactorización del Backend

### Prioridad Alta: Dividir `server/routers.ts`

El archivo `routers.ts` tiene 1333 líneas y debe dividirse en routers modulares.

#### Estructura Propuesta:

```
server/
├── routers/
│   ├── index.ts              # Router principal que combina todos
│   ├── procedures.ts         # ✅ YA CREADO - Procedimientos compartidos
│   ├── authRouter.ts         # Autenticación (líneas 29-208)
│   ├── usersRouter.ts        # Usuarios (líneas 213-344)
│   ├── projectTypesRouter.ts # Tipos de proyecto (líneas 345-379)
│   ├── projectsRouter.ts     # Proyectos (líneas 380-537)
│   ├── milestonesRouter.ts   # Hitos (líneas 587-759)
│   ├── remindersRouter.ts    # Recordatorios (líneas 760-797)
│   ├── aiRouter.ts           # Asistente IA (líneas 798-892)
│   ├── syncRouter.ts         # Sincronización OpenSolar (líneas 893-1012)
│   ├── reportsRouter.ts      # Reportes PDF (líneas 1013-1065)
│   ├── attachmentsRouter.ts  # Archivos adjuntos (líneas 1089-1173)
│   └── notificationsRouter.ts # Notificaciones (líneas 1174-1313)
```

#### Ejemplo de Migración - `authRouter.ts`:

```typescript
/**
 * Router de autenticación
 * Maneja registro, login, logout y recuperación de contraseña
 */

import { router } from "../_core/trpc";
import { publicProcedure } from "./procedures";
import { getSessionCookieOptions } from "../_core/cookies";
import { JWT_COOKIE_NAME, COOKIE_NAME } from "../_core/jwtAuth";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    ctx.res.clearCookie(JWT_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  
  register: publicProcedure
    .input(z.object({
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
      name: z.string().min(1, "El nombre es requerido")
    }))
    .mutation(async ({ input, ctx }) => {
      // ... código de registro
    }),
  
  // ... resto de endpoints
});
```

#### Archivo Principal `routers/index.ts`:

```typescript
/**
 * Router principal que combina todos los sub-routers
 */

import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";
import { metricsRouter } from "../metricsRouters";
import { authRouter } from "./authRouter";
import { usersRouter } from "./usersRouter";
import { projectsRouter } from "./projectsRouter";
import { milestonesRouter } from "./milestonesRouter";
import { remindersRouter } from "./remindersRouter";
import { aiRouter } from "./aiRouter";
import { syncRouter } from "./syncRouter";
import { reportsRouter } from "./reportsRouter";
import { attachmentsRouter } from "./attachmentsRouter";
import { notificationsRouter } from "./notificationsRouter";

export const appRouter = router({
  system: systemRouter,
  analytics: metricsRouter,
  auth: authRouter,
  users: usersRouter,
  projects: projectsRouter,
  milestones: milestonesRouter,
  reminders: remindersRouter,
  ai: aiRouter,
  sync: syncRouter,
  reports: reportsRouter,
  attachments: attachmentsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
```

---

### Prioridad Alta: Dividir `server/db.ts`

El archivo `db.ts` tiene 1020 líneas mezclando conexión, queries y lógica de negocio.

#### Estructura Propuesta:

```
server/
├── config/
│   └── database.ts           # Configuración y conexión a DB
├── repositories/
│   ├── index.ts              # Exporta todos los repositorios
│   ├── projectRepository.ts  # Funciones de proyectos
│   ├── milestoneRepository.ts # Funciones de hitos
│   ├── userRepository.ts     # Funciones de usuarios
│   ├── notificationRepository.ts # Funciones de notificaciones
│   ├── fileRepository.ts     # Funciones de archivos
│   └── metricsRepository.ts  # Funciones de métricas
```

#### Ejemplo - `config/database.ts`:

```typescript
/**
 * Configuración de conexión a base de datos
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../../drizzle/schema';

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const db = drizzle(connection, { schema, mode: 'default' });

export function getDb() {
  return db;
}
```

#### Ejemplo - `repositories/projectRepository.ts`:

```typescript
/**
 * Repositorio de proyectos
 * Maneja todas las operaciones de base de datos relacionadas con proyectos
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../config/database';
import { projects, milestones, users } from '../../drizzle/schema';

/**
 * Obtiene todos los proyectos con información relacionada
 */
export async function getAllProjects() {
  const db = getDb();
  return await db
    .select()
    .from(projects)
    .leftJoin(users, eq(projects.assignedEngineerId, users.id))
    .orderBy(desc(projects.createdAt));
}

/**
 * Obtiene un proyecto por ID con sus hitos
 */
export async function getProjectById(projectId: number) {
  const db = getDb();
  
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .leftJoin(users, eq(projects.assignedEngineerId, users.id));
  
  if (!project) return null;
  
  const projectMilestones = await db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.order);
  
  return {
    ...project,
    milestones: projectMilestones,
  };
}

// ... más funciones
```

---

## Optimizaciones de Rendimiento

### 1. Implementar Caché en el Cliente

**Configurar TanStack Query con tiempos de caché apropiados:**

```typescript
// client/src/main.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutos
      cacheTime: 10 * 60 * 1000,     // 10 minutos
      refetchOnWindowFocus: false,    // No refetch al cambiar de ventana
      retry: 1,                       // Solo 1 reintento en caso de error
    },
  },
});
```

### 2. Optimizar Queries de Base de Datos

**Usar JOINs en lugar de queries múltiples:**

**Antes:**
```typescript
const project = await db.select().from(projects).where(eq(projects.id, id));
const engineer = await db.select().from(users).where(eq(users.id, project.assignedEngineerId));
```

**Después:**
```typescript
const [result] = await db
  .select()
  .from(projects)
  .leftJoin(users, eq(projects.assignedEngineerId, users.id))
  .where(eq(projects.id, id));
```

### 3. Lazy Loading de Componentes

**Cargar componentes grandes solo cuando se necesiten:**

```typescript
import { lazy, Suspense } from 'react';

const ComponentShowcase = lazy(() => import('./pages/ComponentShowcase'));
const GanttChart = lazy(() => import('./pages/GanttChart'));

// En el router
<Suspense fallback={<div>Cargando...</div>}>
  <ComponentShowcase />
</Suspense>
```

---

## Limpieza de Código

### 1. Eliminar Archivos Innecesarios

**Archivos que pueden eliminarse en producción:**

- `client/src/pages/ComponentShowcase.tsx` (1428 líneas) - Solo para demostración
- Archivos `.test.ts` no utilizados
- Archivos de configuración duplicados

### 2. Consolidar Archivos Duplicados

**Eliminar después de migrar a utilidades:**

- `client/src/lib/notifications.ts` → Migrar a `utils/notificationUtils.ts`
- `client/src/lib/pushNotifications.ts` → Migrar a `utils/notificationUtils.ts`

### 3. Limpiar Imports No Utilizados

**Ejecutar ESLint con auto-fix:**

```bash
pnpm add -D eslint-plugin-unused-imports
```

**Configurar en `.eslintrc.json`:**

```json
{
  "plugins": ["unused-imports"],
  "rules": {
    "unused-imports/no-unused-imports": "error"
  }
}
```

---

## Mejoras de Seguridad

### 1. Validación Completa de Entrada

**Asegurar que todos los endpoints tRPC tengan validación Zod:**

```typescript
// Ejemplo de validación completa
.input(z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  capacity: z.number().int().positive().max(10000),
  startDate: z.string().datetime(),
}))
```

### 2. Sanitización de Inputs

**Para campos de texto libre:**

```typescript
import { z } from 'zod';

const sanitizedString = z.string()
  .trim()
  .min(1)
  .max(1000)
  .transform(str => str.replace(/<[^>]*>/g, '')); // Eliminar HTML
```

---

## Testing

### 1. Aumentar Cobertura de Tests

**Áreas prioritarias para testing:**

- Generación de reportes PDF
- Cálculo de progreso de proyectos
- Integración con OpenSolar
- Carga de archivos a S3
- Lógica de notificaciones

### 2. Tests de Integración

**Ejemplo de test de flujo completo:**

```typescript
describe('Flujo completo de proyecto', () => {
  it('debe crear proyecto, agregar hitos y calcular progreso', async () => {
    // Crear proyecto
    const project = await createProject({...});
    
    // Agregar hitos
    await createMilestone({ projectId: project.id, ... });
    
    // Completar hito
    await updateMilestone({ id: milestone.id, status: 'completed' });
    
    // Verificar progreso
    const progress = await calculateProjectProgress(project.id);
    expect(progress).toBeGreaterThan(0);
  });
});
```

---

## Documentación

### 1. JSDoc en Funciones Públicas

**Agregar documentación a funciones principales:**

```typescript
/**
 * Calcula el progreso de un proyecto basado en sus hitos completados
 * 
 * @param projectId - ID del proyecto a calcular
 * @returns Promesa que resuelve con el porcentaje de progreso (0-100)
 * @throws {TRPCError} Si el proyecto no existe
 * 
 * @example
 * ```typescript
 * const progress = await calculateProjectProgress(123);
 * console.log(`Progreso: ${progress}%`);
 * ```
 */
export async function calculateProjectProgress(projectId: number): Promise<number> {
  // ...
}
```

### 2. Diagramas de Arquitectura

**Agregar al README.md:**

- Diagrama de estructura de carpetas
- Diagrama de flujo de datos
- Diagrama de base de datos (ERD)

---

## Plan de Implementación

### Fase 1: Limpieza Inmediata (1-2 días)

- [x] Crear utilidades compartidas
- [ ] Migrar funciones duplicadas a utilidades
- [ ] Eliminar `ComponentShowcase.tsx`
- [ ] Limpiar imports no utilizados
- [ ] Formatear código con Prettier

### Fase 2: Refactorización Backend (3-5 días)

- [ ] Dividir `routers.ts` en módulos
- [ ] Separar `db.ts` en repositorios
- [ ] Crear capa de servicios
- [ ] Mover lógica de negocio fuera de routers

### Fase 3: Optimizaciones (2-3 días)

- [ ] Configurar caché de TanStack Query
- [ ] Optimizar queries con JOINs
- [ ] Implementar lazy loading
- [ ] Reducir bundle size

### Fase 4: Testing y Documentación (2-3 días)

- [ ] Aumentar cobertura de tests
- [ ] Agregar tests de integración
- [ ] Documentar con JSDoc
- [ ] Crear diagramas de arquitectura

---

## Métricas de Éxito

| Métrica | Actual | Objetivo | Estado |
|---------|--------|----------|--------|
| Líneas en `routers.ts` | 1333 | <200 | Pendiente |
| Líneas en `db.ts` | 1020 | <150 | Pendiente |
| Funciones duplicadas | 11 | 0 | ✅ En progreso |
| Archivos >500 líneas | 6 | 2 | Pendiente |
| Cobertura de tests | ~30% | >70% | Pendiente |
| Bundle size | ~2MB | <1.5MB | Pendiente |
| Tiempo de build | ~45s | <30s | Pendiente |

---

## Conclusión

Esta guía proporciona un plan claro y estructurado para mejorar la calidad del código del proyecto. Las mejoras pueden implementarse de forma incremental sin interrumpir el desarrollo o la funcionalidad existente.

**Próximos Pasos:**
1. Revisar y aprobar el plan de refactorización
2. Asignar tareas por fase
3. Implementar mejoras de forma iterativa
4. Medir y validar resultados

---

**Última actualización:** 29 de noviembre de 2025  
**Autor:** Equipo de Desarrollo - Manus AI  
**Proyecto:** Solar Project Manager - GreenH Project
