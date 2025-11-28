# OpenSolar API Integration Notes

## Base URL
```
https://api.opensolar.com/api/
```

## Authentication
- Requiere Bearer Token en header: `Authorization: Bearer <token>`
- El token se obtiene mediante login con credenciales de usuario

## Endpoints Relevantes

### Get Single Project
```
GET /api/orgs/:org_id/projects/:project_id/
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response Fields (Relevantes para nuestro formulario):**
- `id`: ID del proyecto
- `title`: Título del proyecto
- `address`: Dirección completa
- `locality`: Ciudad
- `state`: Estado/Provincia
- `country_name`: País
- `lat`, `lon`: Coordenadas
- `business_name`: Nombre del negocio
- `contacts_data`: Array de contactos con:
  - `first_name`, `family_name`
  - `email`, `phone`
- `created_date`: Fecha de creación
- `modified_date`: Última modificación
- `stage`: Etapa del proyecto
- `priority`: Prioridad (0-5)
- `usage_annual_or_guess`: Consumo anual estimado
- `notes`: Notas del proyecto
- `systems`: Array de sistemas solares diseñados

### List Projects
```
GET /api/orgs/:org_id/projects/
```

**Query Parameters:**
- `page`: Número de página
- `limit`: Límite de resultados
- `fieldset`: "list" o "studio"

## Credenciales
- Email: gerencia@greenhproject.com
- Password: Ghp2025@

## Flujo de Integración

1. **Login** - Obtener Bearer Token
2. **Get Org ID** - Obtener ID de la organización del usuario
3. **Get Project** - Usar project_id ingresado por el usuario
4. **Map Fields** - Mapear campos de OpenSolar a nuestro formulario

## Campos a Mapear

OpenSolar → Solar Project Manager:
- `title` → `name`
- `address` → `location`
- `contacts_data[0].first_name + family_name` → `client`
- `created_date` → `startDate`
- `notes` → `description`
- `usage_annual_or_guess` → Agregar a description
- `systems` → Información técnica en description
