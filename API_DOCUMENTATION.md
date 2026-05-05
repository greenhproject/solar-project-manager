# Solar Project Manager — API REST v1

## Documentación de Integración Externa

**Versión:** 1.0.0  
**Base URL (producción):** `https://spm.ghp.center/api/v1`  
**Base URL (alternativa):** `https://projectmanagerghp.manus.space/api/v1`  
**Documentación interactiva:** `https://spm.ghp.center/api-docs`

---

## Autenticación

Todas las peticiones (excepto `/health`) requieren una **API Key** válida. La key se envía en uno de estos headers:

| Header | Formato |
|--------|---------|
| `X-API-Key` | `spm_tu_api_key_aqui` |
| `Authorization` | `Bearer spm_tu_api_key_aqui` |

### Obtener una API Key

1. Inicia sesión como **administrador** en Solar Project Manager
2. Ve a **Configuración → API Keys** en el panel lateral
3. Genera una nueva key con los permisos necesarios
4. Copia y guarda la key de forma segura (solo se muestra una vez)

Alternativamente, usa el endpoint `POST /api/v1/keys/generate` con una key existente que tenga permiso `admin`.

---

## Permisos Disponibles

| Permiso | Descripción |
|---------|-------------|
| `*` | Acceso total (todos los permisos) |
| `projects:read` | Leer proyectos y sus detalles |
| `milestones:read` | Leer hitos de proyectos |
| `milestones:write` | Actualizar estado y datos de hitos |
| `stats:read` | Ver estadísticas generales |
| `admin` | Gestionar API Keys (crear, listar, desactivar) |

---

## Endpoints

### GET /api/v1/health

Estado de salud de la API. **No requiere autenticación.**

```bash
curl https://spm.ghp.center/api/v1/health
```

**Respuesta:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-04T20:00:00.000Z",
  "database": "connected"
}
```

---

### GET /api/v1/projects

Lista todos los proyectos con paginación y filtros.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar: `planning`, `in_progress`, `on_hold`, `completed`, `cancelled` |
| `limit` | number | Cantidad de resultados (default: 50, max: 100) |
| `offset` | number | Desplazamiento para paginación (default: 0) |

```bash
curl -H "X-API-Key: spm_tu_key" \
  "https://spm.ghp.center/api/v1/projects?status=in_progress&limit=10"
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Instalación Solar Residencial",
      "description": "Proyecto de instalación...",
      "status": "in_progress",
      "progressPercentage": 65,
      "startDate": "2026-01-15T00:00:00.000Z",
      "estimatedEndDate": "2026-03-15T00:00:00.000Z",
      "actualEndDate": null,
      "location": "Bogotá, Colombia",
      "clientName": "Juan Pérez",
      "clientEmail": "juan@email.com",
      "clientPhone": "+573001234567",
      "openSolarId": "OS-12345",
      "createdAt": "2026-01-10T00:00:00.000Z",
      "updatedAt": "2026-03-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /api/v1/projects/:id

Detalle completo de un proyecto con hitos, tipo e ingeniero asignado.

```bash
curl -H "X-API-Key: spm_tu_key" \
  "https://spm.ghp.center/api/v1/projects/1"
```

**Respuesta:**
```json
{
  "data": {
    "id": 1,
    "name": "Instalación Solar Residencial",
    "status": "in_progress",
    "progressPercentage": 65,
    "projectType": {
      "id": 1,
      "name": "Residencial",
      "color": "#FF6B35"
    },
    "milestones": [
      {
        "id": 1,
        "name": "Diseño del sistema",
        "status": "completed",
        "orderIndex": 1,
        "dueDate": "2026-02-01T00:00:00.000Z",
        "completedDate": "2026-01-28T00:00:00.000Z"
      }
    ],
    "assignedEngineer": {
      "id": 2,
      "name": "Carlos Ingeniero",
      "email": "carlos@empresa.com",
      "jobTitle": "Ingeniero Solar"
    }
  }
}
```

---

### GET /api/v1/projects/:id/milestones

Lista todos los hitos de un proyecto ordenados por índice.

```bash
curl -H "X-API-Key: spm_tu_key" \
  "https://spm.ghp.center/api/v1/projects/1/milestones"
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": 1,
      "projectId": 1,
      "name": "Diseño del sistema",
      "description": "Diseño técnico completo",
      "startDate": "2026-01-15T00:00:00.000Z",
      "endDate": "2026-02-01T00:00:00.000Z",
      "durationDays": 17,
      "dueDate": "2026-02-01T00:00:00.000Z",
      "completedDate": "2026-01-28T00:00:00.000Z",
      "status": "completed",
      "orderIndex": 1,
      "weight": 1,
      "notes": null,
      "observations": "Completado antes de tiempo",
      "assignedUserId": 2,
      "createdAt": "2026-01-10T00:00:00.000Z",
      "updatedAt": "2026-01-28T00:00:00.000Z"
    }
  ],
  "total": 8
}
```

---

### GET /api/v1/milestones/:id

Detalle de un hito específico con información del responsable.

```bash
curl -H "X-API-Key: spm_tu_key" \
  "https://spm.ghp.center/api/v1/milestones/1"
```

---

### PATCH /api/v1/milestones/:id

Actualiza estado o campos de un hito. Recalcula automáticamente el progreso del proyecto.

**Body (JSON):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | string | `pending`, `in_progress`, `completed`, `overdue` |
| `notes` | string | Notas del hito (opcional) |
| `observations` | string | Observaciones del equipo (opcional) |
| `completedDate` | string | Fecha ISO de completado (auto-asignada si status=completed) |

```bash
curl -X PATCH \
  -H "X-API-Key: spm_tu_key" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "observations": "Terminado OK"}' \
  "https://spm.ghp.center/api/v1/milestones/1"
```

**Respuesta:**
```json
{
  "data": {
    "id": 1,
    "name": "Diseño del sistema",
    "status": "completed",
    "completedDate": "2026-05-04T20:00:00.000Z"
  },
  "projectProgress": 75
}
```

---

### GET /api/v1/stats

Estadísticas generales del sistema.

```bash
curl -H "X-API-Key: spm_tu_key" \
  "https://spm.ghp.center/api/v1/stats"
```

**Respuesta:**
```json
{
  "data": {
    "projects": {
      "total": 15,
      "inProgress": 5,
      "completed": 8,
      "planning": 2
    },
    "milestones": {
      "total": 120,
      "completed": 85,
      "overdue": 12,
      "completionRate": 71
    },
    "generatedAt": "2026-05-04T20:00:00.000Z"
  }
}
```

---

### POST /api/v1/keys/generate

Genera una nueva API Key. **Requiere permiso `admin`.**

**Body:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre descriptivo (requerido) |
| `permissions` | string[] | Array de permisos (default: `["*"]`) |
| `expiresInDays` | number | Días hasta expiración (opcional) |

```bash
curl -X POST \
  -H "X-API-Key: spm_tu_key_admin" \
  -H "Content-Type: application/json" \
  -d '{"name": "App Móvil", "permissions": ["projects:read", "milestones:write"], "expiresInDays": 90}' \
  "https://spm.ghp.center/api/v1/keys/generate"
```

---

### GET /api/v1/keys

Lista las API Keys existentes (sin mostrar la key completa). **Requiere permiso `admin`.**

---

### DELETE /api/v1/keys/:id

Desactiva una API Key. **Requiere permiso `admin`.**

---

## Códigos de Error

| HTTP | Código | Descripción |
|------|--------|-------------|
| 400 | `INVALID_ID` | ID proporcionado no es válido |
| 400 | `NO_CHANGES` | No se proporcionaron campos para actualizar |
| 400 | `INVALID_INPUT` | Datos de entrada inválidos |
| 401 | `API_KEY_REQUIRED` | No se envió API Key |
| 401 | `INVALID_API_KEY` | API Key inválida o desactivada |
| 401 | `API_KEY_EXPIRED` | La API Key ha expirado |
| 403 | `FORBIDDEN` | No tienes permiso para esta acción |
| 404 | `NOT_FOUND` | Recurso no encontrado |
| 503 | `SERVICE_UNAVAILABLE` | Base de datos no disponible |

---

## Ejemplo de Integración (JavaScript/Node.js)

```javascript
const API_BASE = "https://spm.ghp.center/api/v1";
const API_KEY = "spm_tu_api_key_aqui";

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "API Error");
  }
  return response.json();
}

// Obtener todos los proyectos en progreso
const { data: projects } = await apiRequest("/projects?status=in_progress");

// Marcar un hito como completado
const result = await apiRequest("/milestones/5", {
  method: "PATCH",
  body: JSON.stringify({
    status: "completed",
    observations: "Completado desde app externa"
  })
});
```

---

## Ejemplo de Integración (Python)

```python
import requests

API_BASE = "https://spm.ghp.center/api/v1"
API_KEY = "spm_tu_api_key_aqui"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Obtener proyectos
response = requests.get(f"{API_BASE}/projects", headers=headers)
projects = response.json()["data"]

# Actualizar hito
response = requests.patch(
    f"{API_BASE}/milestones/5",
    headers=headers,
    json={"status": "completed", "observations": "Desde Python"}
)
print(response.json())
```

---

## Notas Importantes

1. Las API Keys se almacenan como hash SHA-256; la key original solo se muestra al momento de generarla.
2. El endpoint `PATCH /milestones/:id` recalcula automáticamente el progreso del proyecto padre.
3. Las fechas se devuelven en formato ISO 8601 (UTC).
4. El límite máximo de resultados por página es 100.
5. La API Key de prueba generada durante desarrollo debe eliminarse antes de producción.

---

**Green House Project © 2026**
