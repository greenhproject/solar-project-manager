import { useState } from "react";
import { Copy, Check, ExternalLink, Key, Server, Shield, Code2, Zap } from "lucide-react";

/**
 * Página de documentación de API REST v1
 * Accesible públicamente en /api-docs
 */
export default function ApiDocs() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
      title="Copiar"
    >
      {copiedId === id ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Code2 className="h-5 w-5 text-orange-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Solar Project Manager API</h1>
              <p className="text-xs text-gray-400">v1.0.0 — REST API para integración externa</p>
            </div>
          </div>
          <a href="/" className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1">
            Ir al App <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-12">
        {/* Introducción */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Introducción</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            La API REST de Solar Project Manager permite integrar tu aplicación externa con el sistema de gestión de proyectos solares.
            Puedes consultar proyectos, hitos, estadísticas y actualizar el estado de los hitos desde cualquier aplicación.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <Server className="h-5 w-5 text-blue-400 mb-2" />
              <h3 className="font-semibold text-sm text-white">Base URL</h3>
              <code className="text-xs text-orange-300 break-all">{baseUrl}/api/v1</code>
            </div>
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <Shield className="h-5 w-5 text-green-400 mb-2" />
              <h3 className="font-semibold text-sm text-white">Autenticación</h3>
              <p className="text-xs text-gray-400">API Key en header</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-800">
              <Zap className="h-5 w-5 text-yellow-400 mb-2" />
              <h3 className="font-semibold text-sm text-white">Formato</h3>
              <p className="text-xs text-gray-400">JSON (application/json)</p>
            </div>
          </div>
        </section>

        {/* Autenticación */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Key className="h-6 w-6 text-orange-400" />
            Autenticación
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Todas las peticiones (excepto <code className="text-orange-300 bg-gray-800 px-1 rounded">/health</code>) requieren una API Key válida.
            Envíala en uno de estos headers:
          </p>
          <div className="space-y-3">
            <div className="relative">
              <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
                <code className="text-gray-300">
{`# Opción 1: Header X-API-Key
curl -H "X-API-Key: spm_tu_api_key_aqui" \\
  ${baseUrl}/api/v1/projects

# Opción 2: Bearer Token
curl -H "Authorization: Bearer spm_tu_api_key_aqui" \\
  ${baseUrl}/api/v1/projects`}
                </code>
              </pre>
              <CopyButton text={`curl -H "X-API-Key: spm_tu_api_key_aqui" ${baseUrl}/api/v1/projects`} id="auth-example" />
            </div>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-amber-950/30 border border-amber-800/50">
            <h4 className="text-sm font-semibold text-amber-300 mb-2">¿Cómo obtener una API Key?</h4>
            <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
              <li>Inicia sesión como administrador en Solar Project Manager</li>
              <li>Ve a <strong>Configuración → API Keys</strong> (o usa el endpoint <code className="text-orange-300 bg-gray-800 px-1 rounded">POST /api/v1/keys/generate</code> con una key existente)</li>
              <li>Genera una nueva key con los permisos necesarios</li>
              <li>Copia y guarda la key de forma segura (solo se muestra una vez)</li>
            </ol>
          </div>
        </section>

        {/* Permisos */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Permisos</h2>
          <p className="text-gray-300 mb-4">Cada API Key puede tener permisos granulares:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-300 font-semibold">Permiso</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-semibold">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr><td className="px-4 py-2"><code className="text-orange-300">*</code></td><td className="px-4 py-2 text-gray-400">Acceso total (todos los permisos)</td></tr>
                <tr><td className="px-4 py-2"><code className="text-orange-300">projects:read</code></td><td className="px-4 py-2 text-gray-400">Leer proyectos y sus detalles</td></tr>
                <tr><td className="px-4 py-2"><code className="text-orange-300">milestones:read</code></td><td className="px-4 py-2 text-gray-400">Leer hitos de proyectos</td></tr>
                <tr><td className="px-4 py-2"><code className="text-orange-300">milestones:write</code></td><td className="px-4 py-2 text-gray-400">Actualizar estado y datos de hitos</td></tr>
                <tr><td className="px-4 py-2"><code className="text-orange-300">stats:read</code></td><td className="px-4 py-2 text-gray-400">Ver estadísticas generales</td></tr>
                <tr><td className="px-4 py-2"><code className="text-orange-300">admin</code></td><td className="px-4 py-2 text-gray-400">Gestionar API Keys</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Endpoints</h2>

          {/* Health */}
          <EndpointDoc
            method="GET"
            path="/api/v1/health"
            description="Estado de salud de la API. No requiere autenticación."
            permission="Ninguno"
            responseExample={`{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-04T20:00:00.000Z",
  "database": "connected"
}`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* GET Projects */}
          <EndpointDoc
            method="GET"
            path="/api/v1/projects"
            description="Lista todos los proyectos con paginación y filtros opcionales."
            permission="projects:read"
            queryParams={[
              { name: "status", type: "string", description: "Filtrar por estado: planning, in_progress, on_hold, completed, cancelled" },
              { name: "limit", type: "number", description: "Cantidad de resultados (default: 50, max: 100)" },
              { name: "offset", type: "number", description: "Desplazamiento para paginación (default: 0)" },
            ]}
            responseExample={`{
  "data": [
    {
      "id": 1,
      "name": "Instalación Solar Residencial",
      "status": "in_progress",
      "progressPercentage": 65,
      "startDate": "2026-01-15T00:00:00.000Z",
      "estimatedEndDate": "2026-03-15T00:00:00.000Z",
      "clientName": "Juan Pérez",
      "location": "Bogotá, Colombia"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}`}
            curlExample={`curl -H "X-API-Key: spm_tu_key" "${baseUrl}/api/v1/projects?status=in_progress&limit=10"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* GET Project by ID */}
          <EndpointDoc
            method="GET"
            path="/api/v1/projects/:id"
            description="Obtiene el detalle completo de un proyecto, incluyendo hitos, tipo de proyecto e ingeniero asignado."
            permission="projects:read"
            responseExample={`{
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
        "dueDate": "2026-02-01T00:00:00.000Z"
      }
    ],
    "assignedEngineer": {
      "id": 2,
      "name": "Carlos Ingeniero",
      "email": "carlos@empresa.com"
    }
  }
}`}
            curlExample={`curl -H "X-API-Key: spm_tu_key" "${baseUrl}/api/v1/projects/1"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* GET Milestones by Project */}
          <EndpointDoc
            method="GET"
            path="/api/v1/projects/:id/milestones"
            description="Lista todos los hitos de un proyecto específico, ordenados por índice."
            permission="milestones:read"
            responseExample={`{
  "data": [
    {
      "id": 1,
      "name": "Diseño del sistema",
      "status": "completed",
      "orderIndex": 1,
      "dueDate": "2026-02-01T00:00:00.000Z",
      "completedDate": "2026-01-28T00:00:00.000Z",
      "assignedUserId": 2,
      "observations": "Completado antes de tiempo"
    }
  ],
  "total": 8
}`}
            curlExample={`curl -H "X-API-Key: spm_tu_key" "${baseUrl}/api/v1/projects/1/milestones"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* GET Milestone by ID */}
          <EndpointDoc
            method="GET"
            path="/api/v1/milestones/:id"
            description="Obtiene el detalle de un hito específico con información del responsable asignado."
            permission="milestones:read"
            responseExample={`{
  "data": {
    "id": 1,
    "name": "Diseño del sistema",
    "status": "completed",
    "dueDate": "2026-02-01T00:00:00.000Z",
    "completedDate": "2026-01-28T00:00:00.000Z",
    "observations": "Completado antes de tiempo",
    "assignedUser": {
      "id": 2,
      "name": "Carlos Ingeniero",
      "email": "carlos@empresa.com"
    }
  }
}`}
            curlExample={`curl -H "X-API-Key: spm_tu_key" "${baseUrl}/api/v1/milestones/1"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* PATCH Milestone */}
          <EndpointDoc
            method="PATCH"
            path="/api/v1/milestones/:id"
            description="Actualiza el estado o campos de un hito. Recalcula automáticamente el progreso del proyecto."
            permission="milestones:write"
            bodyParams={[
              { name: "status", type: "string", description: "Nuevo estado: pending, in_progress, completed, overdue" },
              { name: "notes", type: "string", description: "Notas del hito (opcional)" },
              { name: "observations", type: "string", description: "Observaciones del equipo (opcional)" },
              { name: "completedDate", type: "string", description: "Fecha de completado ISO (opcional, auto-asignada si status=completed)" },
            ]}
            responseExample={`{
  "data": {
    "id": 1,
    "name": "Diseño del sistema",
    "status": "completed",
    "completedDate": "2026-05-04T20:00:00.000Z"
  },
  "projectProgress": 75
}`}
            curlExample={`curl -X PATCH -H "X-API-Key: spm_tu_key" \\
  -H "Content-Type: application/json" \\
  -d '{"status": "completed", "observations": "Terminado OK"}' \\
  "${baseUrl}/api/v1/milestones/1"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* GET Stats */}
          <EndpointDoc
            method="GET"
            path="/api/v1/stats"
            description="Estadísticas generales del sistema: conteo de proyectos por estado y hitos."
            permission="stats:read"
            responseExample={`{
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
}`}
            curlExample={`curl -H "X-API-Key: spm_tu_key" "${baseUrl}/api/v1/stats"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />

          {/* POST Generate Key */}
          <EndpointDoc
            method="POST"
            path="/api/v1/keys/generate"
            description="Genera una nueva API Key. Solo disponible para administradores."
            permission="admin"
            bodyParams={[
              { name: "name", type: "string", description: "Nombre descriptivo de la key (requerido)" },
              { name: "permissions", type: "string[]", description: 'Array de permisos (default: ["*"])' },
              { name: "expiresInDays", type: "number", description: "Días hasta expiración (opcional, null = no expira)" },
            ]}
            responseExample={`{
  "data": {
    "key": "spm_a1b2c3d4e5f6...",
    "prefix": "spm_a1b2",
    "name": "Integración App Móvil",
    "permissions": ["projects:read", "milestones:read", "milestones:write"],
    "expiresAt": "2026-08-04T20:00:00.000Z",
    "warning": "⚠️ Guarda esta key de forma segura. No se puede recuperar."
  }
}`}
            curlExample={`curl -X POST -H "X-API-Key: spm_tu_key_admin" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "App Móvil", "permissions": ["projects:read", "milestones:write"]}' \\
  "${baseUrl}/api/v1/keys/generate"`}
            baseUrl={baseUrl}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
          />
        </section>

        {/* Códigos de Error */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Códigos de Error</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-800 rounded-lg overflow-hidden">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-300 font-semibold">HTTP</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-semibold">Código</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-semibold">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                <tr><td className="px-4 py-2 text-yellow-400">400</td><td className="px-4 py-2"><code className="text-orange-300">INVALID_ID</code></td><td className="px-4 py-2 text-gray-400">ID proporcionado no es válido</td></tr>
                <tr><td className="px-4 py-2 text-yellow-400">400</td><td className="px-4 py-2"><code className="text-orange-300">NO_CHANGES</code></td><td className="px-4 py-2 text-gray-400">No se proporcionaron campos para actualizar</td></tr>
                <tr><td className="px-4 py-2 text-red-400">401</td><td className="px-4 py-2"><code className="text-orange-300">API_KEY_REQUIRED</code></td><td className="px-4 py-2 text-gray-400">No se envió API Key</td></tr>
                <tr><td className="px-4 py-2 text-red-400">401</td><td className="px-4 py-2"><code className="text-orange-300">INVALID_API_KEY</code></td><td className="px-4 py-2 text-gray-400">API Key inválida o desactivada</td></tr>
                <tr><td className="px-4 py-2 text-red-400">401</td><td className="px-4 py-2"><code className="text-orange-300">API_KEY_EXPIRED</code></td><td className="px-4 py-2 text-gray-400">La API Key ha expirado</td></tr>
                <tr><td className="px-4 py-2 text-purple-400">403</td><td className="px-4 py-2"><code className="text-orange-300">FORBIDDEN</code></td><td className="px-4 py-2 text-gray-400">No tienes permiso para esta acción</td></tr>
                <tr><td className="px-4 py-2 text-blue-400">404</td><td className="px-4 py-2"><code className="text-orange-300">NOT_FOUND</code></td><td className="px-4 py-2 text-gray-400">Recurso no encontrado</td></tr>
                <tr><td className="px-4 py-2 text-gray-400">503</td><td className="px-4 py-2"><code className="text-orange-300">SERVICE_UNAVAILABLE</code></td><td className="px-4 py-2 text-gray-400">Base de datos no disponible</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Ejemplo de integración */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Ejemplo de Integración (JavaScript/Node.js)</h2>
          <div className="relative">
            <pre className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm overflow-x-auto">
              <code className="text-gray-300">
{`const API_BASE = "${baseUrl}/api/v1";
const API_KEY = "spm_tu_api_key_aqui";

// Función helper para peticiones
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
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
console.log("Proyectos activos:", projects.length);

// Marcar un hito como completado
const result = await apiRequest("/milestones/5", {
  method: "PATCH",
  body: JSON.stringify({
    status: "completed",
    observations: "Completado desde app externa"
  })
});
console.log("Nuevo progreso:", result.projectProgress + "%");`}
              </code>
            </pre>
            <CopyButton text={`const API_BASE = "${baseUrl}/api/v1";\nconst API_KEY = "spm_tu_api_key_aqui";\n\nasync function apiRequest(endpoint, options = {}) {\n  const response = await fetch(\`\${API_BASE}\${endpoint}\`, {\n    ...options,\n    headers: {\n      "X-API-Key": API_KEY,\n      "Content-Type": "application/json",\n      ...options.headers,\n    },\n  });\n  if (!response.ok) {\n    const error = await response.json();\n    throw new Error(error.message || "API Error");\n  }\n  return response.json();\n}`} id="integration-example" />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 pt-6 pb-8">
          <p className="text-sm text-gray-500 text-center">
            Solar Project Manager API v1.0.0 — Green House Project © 2026
          </p>
        </footer>
      </main>
    </div>
  );
}

// ============================================
// Componente reutilizable para documentar endpoints
// ============================================

interface ParamDoc {
  name: string;
  type: string;
  description: string;
}

interface EndpointDocProps {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  description: string;
  permission: string;
  queryParams?: ParamDoc[];
  bodyParams?: ParamDoc[];
  responseExample: string;
  curlExample?: string;
  baseUrl: string;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
}

function EndpointDoc({ method, path, description, permission, queryParams, bodyParams, responseExample, curlExample, copyToClipboard, copiedId }: EndpointDocProps) {
  const methodColors: Record<string, string> = {
    GET: "bg-green-900/50 text-green-300 border-green-700",
    POST: "bg-blue-900/50 text-blue-300 border-blue-700",
    PATCH: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    PUT: "bg-purple-900/50 text-purple-300 border-purple-700",
    DELETE: "bg-red-900/50 text-red-300 border-red-700",
  };

  const id = `${method}-${path}`.replace(/[^a-zA-Z0-9]/g, "-");

  return (
    <div className="mb-8 border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 flex items-center gap-3 flex-wrap">
        <span className={`px-2 py-0.5 text-xs font-bold rounded border ${methodColors[method]}`}>
          {method}
        </span>
        <code className="text-sm text-white font-mono">{path}</code>
        <span className="ml-auto text-xs text-gray-500">Permiso: <code className="text-orange-300">{permission}</code></span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-300">{description}</p>

        {/* Query Params */}
        {queryParams && queryParams.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Query Parameters</h4>
            <div className="space-y-1">
              {queryParams.map(p => (
                <div key={p.name} className="flex items-start gap-2 text-sm">
                  <code className="text-orange-300 bg-gray-800 px-1 rounded text-xs mt-0.5">{p.name}</code>
                  <span className="text-gray-500 text-xs mt-0.5">({p.type})</span>
                  <span className="text-gray-400 text-xs">{p.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body Params */}
        {bodyParams && bodyParams.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Body (JSON)</h4>
            <div className="space-y-1">
              {bodyParams.map(p => (
                <div key={p.name} className="flex items-start gap-2 text-sm">
                  <code className="text-orange-300 bg-gray-800 px-1 rounded text-xs mt-0.5">{p.name}</code>
                  <span className="text-gray-500 text-xs mt-0.5">({p.type})</span>
                  <span className="text-gray-400 text-xs">{p.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* cURL Example */}
        {curlExample && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Ejemplo cURL</h4>
            <div className="relative">
              <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs overflow-x-auto">
                <code className="text-gray-300">{curlExample}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(curlExample, `curl-${id}`)}
                className="absolute top-1.5 right-1.5 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
              >
                {copiedId === `curl-${id}` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        )}

        {/* Response */}
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Respuesta</h4>
          <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs overflow-x-auto">
            <code className="text-gray-300">{responseExample}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
