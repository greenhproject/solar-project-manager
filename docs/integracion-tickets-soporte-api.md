# Integración de tickets de Soporte en Solar Project Manager

## Propósito

Solar Project Manager muestra un aviso de servicio dentro de cada proyecto cuando existen tickets activos de GHP Soporte asociados al mismo proyecto OpenSolar y asignados al correo del usuario que consulta el proyecto.

La integración no copia el expediente de soporte a Solar Project Manager. GHP Soporte sigue siendo la fuente de verdad de los tickets. Solar Project Manager consulta solo un resumen privado al cargar el detalle de proyecto.

## Regla de asociación

El vínculo no utiliza el ID interno de Solar Project Manager. La relación exacta es:

```text
GHP Soporte.tickets.project_id = Solar Project Manager.projects.openSolarId
```

El número completo de ticket conserva su consecutivo. Por ejemplo, los tickets `9255866-001` y `9255866-002` pertenecen ambos al proyecto cuya referencia OpenSolar es `9255866`.

## Privacidad por responsable

La consulta se ejecuta desde el backend de Solar Project Manager. Se envía el correo normalizado de la sesión autenticada y GHP Soporte devuelve solo tickets activos cuyo técnico asignado tenga exactamente el mismo correo. La tarjeta no aparece para administradores, ingenieros u otros usuarios que puedan abrir el proyecto pero no sean el responsable actual del ticket.

Los estados activos son `new`, `assigned`, `in_progress`, `waiting` y `escalated`. Los tickets resueltos, cerrados, sin responsable o asignados a otra persona no aparecen.

La respuesta no contiene descripción, título, cliente, comentarios, archivos, correos ni identificadores internos de Soporte. Solo incluye número de ticket, estado, prioridad y un enlace HTTPS a Soporte, donde se aplican nuevamente los permisos propios de esa plataforma.

## Variables privadas de Railway

Configure los siguientes valores como secretos en el backend de Solar Project Manager. No use variables `VITE_*`, no los incluya en código y no reutilice los secretos de GHP Notification Hub.

| Variable | Valor |
|---|---|
| `SUPPORT_TICKETS_API_URL` | `https://soporte-backend-ghp-production.up.railway.app` |
| `SUPPORT_TICKETS_SOURCE_KEY` | Mismo valor que `SPM_TICKETS_SOURCE_KEY` en GHP Soporte. |
| `SUPPORT_TICKETS_SIGNING_SECRET` | Mismo valor que `SPM_TICKETS_SIGNING_SECRET` en GHP Soporte. |

El backend de Soporte requiere sus equivalentes `SPM_TICKETS_SOURCE_KEY` y `SPM_TICKETS_SIGNING_SECRET`. Ambos servicios deben compartir exactamente los mismos valores. Se recomienda generar un secreto aleatorio de al menos 32 bytes y rotarlo como una credencial de integración independiente.

## Comportamiento ante problemas

Si el proyecto no tiene `openSolarId`, faltan variables, la firma es rechazada o Soporte está temporalmente indisponible, el detalle de proyecto continúa cargando sin interrupción. En ese caso simplemente no muestra la tarjeta de tickets. Esta decisión evita bloquear la gestión del proyecto y evita una apertura insegura ante errores.

## Validación de producción

1. Configure los secretos en Railway para ambos backends y permita sus redeploys.
2. Elija un proyecto con `openSolarId` conocido, por ejemplo `9255866`.
3. Cree o asigne `9255866-001` a un usuario cuyo correo sea idéntico en ambas plataformas.
4. Abra el proyecto con ese usuario en Solar Project Manager. Debe mostrarse la tarjeta de ticket de servicio.
5. Abra el mismo proyecto con otra cuenta. No debe aparecer ticket alguno.
6. Reasigne, resuelva o cierre el ticket y compruebe que el aviso cambia para el responsable correcto o desaparece.
