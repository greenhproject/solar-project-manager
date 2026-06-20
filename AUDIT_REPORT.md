# Auditoría Enterprise Grade — Solar Project Manager

**Fecha**: 4 de junio de 2026  
**Autor**: Manus AI  
**Proyecto**: Solar Project Manager (GreenH Project)  
**Stack**: React 19 + Tailwind 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL (TiDB)  
**Despliegue**: Railway (producción) + Manus (desarrollo)

---

## 1. Resumen Ejecutivo

Se realizó una auditoría integral del proyecto Solar Project Manager evaluando 10 dimensiones enterprise grade: código limpio, robustez, rendimiento, seguridad, escalabilidad, pruebas, análisis preventivo, deuda técnica, mantenibilidad y documentación. El proyecto cuenta con **~42,000 líneas de código** (9,715 backend + 32,019 frontend), **89 dependencias de producción**, **41 archivos de test** y **22 tablas en la base de datos**.

El sistema es funcional y cubre un amplio espectro de funcionalidades (gestión de proyectos, hitos, recordatorios, métricas, portal de clientes, API REST, webhooks, SSO, asistente IA). Sin embargo, se identificaron **hallazgos críticos** en seguridad y arquitectura que requieren atención inmediata para alcanzar un nivel enterprise grade.

---

## 2. Métricas Generales del Proyecto

| Dimensión | Valor | Evaluación |
|-----------|-------|------------|
| Líneas de código backend | 9,715 | Alto — archivo `routers.ts` con 3,877 líneas excede límite recomendado |
| Líneas de código frontend | 32,019 | Aceptable — bien distribuido en páginas |
| Tablas de base de datos | 22 | Adecuado — con índices en columnas principales |
| Dependencias de producción | 89 | **Alto riesgo** — superficie de ataque amplia |
| Archivos de test | 41 | Buena cobertura de archivos |
| Tests totales | 387 (374 pass / 13 fail) | **96.6% pass rate** — 7 archivos con fallos |
| Uso de `as any` | 93 instancias | Deuda técnica significativa |
| Funciones exportadas en db.ts | 106 | Necesita modularización |

---

## 3. Hallazgos Críticos (Severidad Alta)

### 3.1 Vulnerabilidad de Open Redirect en SSO

**Archivo**: `server/routes/sso.ts` (línea 186)

El parámetro `redirectTo` se acepta del body de la petición sin ninguna validación y se usa directamente en `res.redirect()`. Un atacante con una API key válida podría redirigir usuarios a sitios maliciosos.

```typescript
// VULNERABLE: redirectTo no se valida
const redirectTo = tokenData.redirectTo || "/portal";
return res.redirect(redirectTo);
```

**Impacto**: Un atacante podría enviar `redirectTo: "https://sitio-malicioso.com"` y redirigir a usuarios legítimos después de autenticarse, facilitando ataques de phishing.

**Recomendación**: Validar que `redirectTo` sea una ruta relativa o pertenezca a un dominio permitido (whitelist).

---

### 3.2 Ausencia Total de Rate Limiting

No existe ningún mecanismo de limitación de tasa en ningún endpoint del sistema. Esto aplica a:

- Endpoint de login (`auth.login`) — vulnerable a ataques de fuerza bruta
- Endpoint de registro (`auth.register`) — vulnerable a spam de cuentas
- Endpoint de recuperación de contraseña (`auth.forgotPassword`) — vulnerable a enumeración de emails
- API REST v1 (`/api/v1/*`) — vulnerable a abuso de API
- Endpoint SSO (`/api/sso/token`) — vulnerable a generación masiva de tokens

**Impacto**: Un atacante puede realizar intentos ilimitados de login, generar miles de cuentas falsas, o agotar recursos del servidor.

**Recomendación**: Implementar `express-rate-limit` con límites diferenciados por endpoint (login: 5/min, registro: 3/min, API: 100/min).

---

### 3.3 CORS Wildcard en API REST Pública

**Archivo**: `server/routes/api-v1.ts` (línea 21)

```typescript
res.header("Access-Control-Allow-Origin", "*");
```

**Impacto**: Cualquier sitio web puede realizar peticiones a la API. Aunque la autenticación por API key mitiga parcialmente el riesgo, combinado con la falta de rate limiting, facilita ataques de abuso desde cualquier origen.

**Recomendación**: Restringir CORS a dominios conocidos (`spm.ghp.center`, `greenhproject.com`) o al menos documentar que es intencional para integraciones externas.

---

### 3.4 Ausencia de Security Headers (Helmet)

No se implementa `helmet` ni ningún middleware de headers de seguridad. Faltan:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy`
- `X-XSS-Protection`

**Impacto**: El sitio es vulnerable a clickjacking, MIME sniffing, y otros ataques basados en headers.

---

### 3.5 Tokens SSO en Memoria (No Persistente)

**Archivo**: `server/routes/sso.ts` (línea 22)

```typescript
const ssoTokens = new Map<string, {...}>();
```

Los tokens SSO se almacenan en un `Map` en memoria. Si el servidor se reinicia (deploy, crash, scaling), todos los tokens activos se pierden. En un entorno con múltiples instancias (Railway autoscale), los tokens no se comparten entre instancias.

**Impacto**: Usuarios en proceso de SSO pierden su sesión si el servidor se reinicia. En multi-instancia, el token generado en una instancia no es válido en otra.

**Recomendación**: Migrar a almacenamiento en base de datos con TTL, o usar Redis.

---

## 4. Hallazgos de Severidad Media

### 4.1 Archivo `routers.ts` Monolítico (3,877 líneas)

El archivo principal de rutas contiene toda la lógica de negocio en un solo archivo. Esto viola el principio de responsabilidad única (SRP) y dificulta:

- Revisión de código (code review)
- Testing aislado
- Trabajo en equipo paralelo
- Navegación y mantenimiento

**Recomendación**: Dividir en módulos: `server/routers/auth.ts`, `server/routers/projects.ts`, `server/routers/milestones.ts`, etc. (el README ya lo sugiere: "Keep router files under ~150 lines").

---

### 4.2 Patrón N+1 en Consultas de Base de Datos

Se identificaron múltiples instancias de queries dentro de loops:

```typescript
// server/routers.ts línea 112
for (const proj of matchingProjects) {
  await dbInst.insert(clientProjectAccess).values({...});
}

// server/routers.ts línea 3531
for (const field of input.fields) {
  await db.createDynamicDocField({...});
}
```

**Impacto**: Degradación de rendimiento proporcional al número de registros. Con 50+ proyectos o campos, cada operación multiplica las consultas a la base de datos.

**Recomendación**: Usar `INSERT ... VALUES (...), (...), (...)` (batch insert) o `Promise.all()` para operaciones paralelas.

---

### 4.3 Queries Sin Paginación

La función `getAllProjects()` en `db.ts` (línea 217) retorna TODOS los proyectos sin límite:

```typescript
return await db.select().from(projects).orderBy(desc(projects.createdAt));
```

Lo mismo ocurre con `getAllUsers()` (línea 148) y varias funciones de listado.

**Impacto**: A medida que crece la base de datos, estas consultas consumirán más memoria y tiempo. Con 1,000+ proyectos, el tiempo de respuesta se degradará significativamente.

**Recomendación**: Implementar paginación por cursor o offset en todas las funciones de listado.

---

### 4.4 Ausencia de Transacciones en Operaciones Compuestas

No se encontró ningún uso de transacciones de base de datos en todo el proyecto. Operaciones como "crear proyecto + crear hitos + crear actualización" (líneas 637-727 de routers.ts) se ejecutan como queries independientes.

**Impacto**: Si falla la creación de un hito a mitad del proceso, el proyecto queda en estado inconsistente (proyecto creado pero con hitos parciales).

**Recomendación**: Envolver operaciones compuestas en `db.transaction()`.

---

### 4.5 JWT con Expiración de 30 Días Sin Rotación

**Archivo**: `server/_core/jwtAuth.ts` (línea 46)

```typescript
const expiresInMs = options.expiresInMs ?? 30 * 24 * 60 * 60 * 1000; // 30 days
```

Los tokens JWT tienen una validez de 30 días sin mecanismo de rotación ni revocación.

**Impacto**: Si un token es comprometido, el atacante tiene acceso durante 30 días completos sin posibilidad de revocación.

**Recomendación**: Reducir a 7 días con refresh tokens, o implementar una blacklist de tokens revocados.

---

### 4.6 Validación de Input Insuficiente en API REST

Los endpoints REST en `api-v1.ts` extraen datos directamente de `req.body` sin validación con Zod:

```typescript
// Línea 332 - Sin validación de tipos
const { status, notes, observations, completedDate } = req.body;

// Línea 475 - Sin validación de formato
const { name, permissions = ["*"], expiresInDays } = req.body;
```

**Impacto**: Datos malformados pueden causar errores inesperados o inyección de datos inválidos.

**Recomendación**: Aplicar schemas Zod en todos los endpoints REST, igual que en los procedimientos tRPC.

---

### 4.7 Logging de Información Sensible

Se encontraron logs que exponen metadata de tokens:

```typescript
// server/_core/auth0Service.ts:91
console.log("[Auth0] Token verified", {...});

// server/routers.ts:202
console.log("[Login Success]", { userId, email, tokenLength, authMethod });
```

**Impacto**: En producción, los logs pueden ser accedidos por personal no autorizado o servicios de monitoreo externos.

**Recomendación**: Usar un logger estructurado (pino/winston) con niveles, y nunca loguear tokens o metadata de autenticación en producción.

---

## 5. Hallazgos de Severidad Baja

### 5.1 Ausencia de Lazy Loading en Frontend

Todas las 35+ páginas se importan de forma estática en `App.tsx`. No hay uso de `React.lazy()` ni `Suspense`.

**Impacto**: El bundle inicial incluye todo el código de todas las páginas, aumentando el tiempo de carga inicial (especialmente en móviles con conexión lenta).

**Recomendación**: Implementar code splitting con `React.lazy()` para rutas que no son la landing page.

---

### 5.2 Componentes Excesivamente Grandes

| Componente | Líneas | Evaluación |
|-----------|--------|------------|
| ProjectDetail.tsx | 1,620 | Debe dividirse en sub-componentes |
| ComponentShowcase.tsx | 1,431 | Archivo de demo, aceptable |
| TramitesYDiseno.tsx | 1,361 | Debe dividirse |
| GanttChart.tsx | 881 | Aceptable para complejidad del Gantt |
| ApiDocs.tsx | 707 | Aceptable para documentación |

---

### 5.3 Uso Excesivo de `as any` (93 instancias)

El uso de `as any` elimina la seguridad de tipos de TypeScript. Las instancias más problemáticas están en:

- Casteos de resultados de Drizzle ORM
- Acceso a propiedades de usuario (`(user as any).status`)
- Queries raw con `db.execute()`

**Recomendación**: Definir tipos explícitos para resultados de queries y eliminar casteos innecesarios.

---

### 5.4 Tests Fallidos (13 de 387)

| Archivo de Test | Fallos | Causa |
|----------------|--------|-------|
| weekends-toggle.test.ts | 2 | Código refactorizado sin actualizar test |
| dark-mode.test.ts | 6 | Páginas nuevas sin variantes dark: |
| profile-enhancements.test.ts | 1 | Cambio en estructura de componente |
| reminders.test.ts | 1 | Cambio en lógica de fechas |
| metrics.fix.test.ts | 1 | Datos de test inconsistentes |
| auth.logout.test.ts | 1 | Cambio en configuración de cookies |
| opensolar.equipment.integration.test.ts | 1 | Timeout de API externa |

**Recomendación**: Corregir los 13 tests fallidos antes del próximo deploy. Los tests de dark-mode indican páginas sin soporte de tema oscuro.

---

### 5.5 Falta de Manejo Global de Errores

No hay handlers para `uncaughtException` ni `unhandledRejection` a nivel de proceso. Los `.catch(() => {})` vacíos en webhookService suprimen errores silenciosamente.

---

## 6. Deuda Técnica Acumulada

| Categoría | Cantidad | Prioridad |
|-----------|----------|-----------|
| Casteos `as any` | 93 | Media |
| Funciones en db.ts | 106 (archivo monolítico) | Media |
| Dependencias de producción | 89 (posible bloat) | Baja |
| TODOs en código | 1 (`reportUrl: null // TODO`) | Baja |
| Inline styles en JSX | 36 | Baja |
| Páginas sin dark mode | 5+ | Baja |

---

## 7. Aspectos Positivos

El proyecto demuestra buenas prácticas en varias áreas:

- **Índices de base de datos**: Todas las tablas principales tienen índices en columnas frecuentemente consultadas (status, projectId, userId).
- **Separación de roles**: Sistema de roles bien implementado (admin, engineer, ingeniero_tramites, client) con middleware de autorización.
- **Error Boundary en frontend**: Implementado a nivel global en App.tsx.
- **Validación con Zod en tRPC**: Todos los procedimientos tRPC validan inputs con schemas tipados.
- **Responsive design**: 296 clases responsive encontradas en el frontend.
- **Accesibilidad básica**: 62 atributos ARIA, 59 reglas de focus management.
- **Cobertura de tests**: 41 archivos de test con 387 casos (96.6% pass rate).
- **Protección de usuario maestro**: El email `greenhproject@gmail.com` está protegido contra eliminación y cambio de rol.
- **Webhook con HMAC**: Las firmas de webhooks usan HMAC-SHA256 correctamente.
- **Timezone configurable**: Sistema de timezone con caché y soporte para América Latina.

---

## 8. Plan de Acción Recomendado

### Fase 1: Seguridad Crítica (1-2 semanas)

1. Implementar rate limiting en endpoints de autenticación y API
2. Validar `redirectTo` en SSO contra whitelist de dominios
3. Agregar Helmet para security headers
4. Migrar tokens SSO de memoria a base de datos
5. Reducir expiración JWT a 7 días con refresh token

### Fase 2: Robustez (2-3 semanas)

6. Agregar transacciones en operaciones compuestas
7. Implementar validación Zod en endpoints REST
8. Corregir los 13 tests fallidos
9. Eliminar logging de información sensible en producción

### Fase 3: Rendimiento (3-4 semanas)

10. Implementar paginación en todas las funciones de listado
11. Convertir N+1 queries a batch operations
12. Implementar lazy loading en frontend
13. Dividir componentes grandes (>800 líneas)

### Fase 4: Mantenibilidad (4-6 semanas)

14. Dividir `routers.ts` en módulos por dominio
15. Dividir `db.ts` en módulos por entidad
16. Eliminar casteos `as any` con tipos explícitos
17. Implementar logging estructurado (pino)
18. Agregar dark mode a páginas faltantes

---

## 9. Clasificación de Riesgo

| Riesgo | Probabilidad | Impacto | Prioridad |
|--------|-------------|---------|-----------|
| Ataque de fuerza bruta en login | Alta | Alto | **Crítica** |
| Open redirect en SSO | Media | Alto | **Crítica** |
| Pérdida de tokens SSO en restart | Alta | Medio | Alta |
| Degradación por queries sin paginación | Media | Medio | Media |
| Inconsistencia por falta de transacciones | Baja | Alto | Media |
| Bundle size excesivo en móviles | Alta | Bajo | Baja |

---

## 10. Conclusión

El proyecto Solar Project Manager es funcional y cubre un amplio espectro de necesidades de gestión de proyectos solares. Sin embargo, para alcanzar un nivel **enterprise grade**, requiere atención inmediata en las áreas de seguridad (rate limiting, open redirect, security headers) y robustez (transacciones, validación). Las mejoras de rendimiento y mantenibilidad pueden abordarse de forma incremental sin afectar la operación actual.

La prioridad absoluta debe ser la **Fase 1 de Seguridad**, ya que las vulnerabilidades identificadas pueden ser explotadas activamente en producción.
