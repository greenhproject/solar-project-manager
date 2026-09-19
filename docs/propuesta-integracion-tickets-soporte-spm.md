# Propuesta de integración: Tickets de Soporte en Solar Project Manager

**Producto:** Green House Project  
**Estado:** Propuesta técnica y funcional; no implementada ni desplegada  
**Fecha:** 19 de septiembre de 2026  
**Autor:** Manus AI

## Conclusión

La mejora es viable y puede conservar una separación estricta entre los dos sistemas. El aviso debe aparecer dentro del detalle de un proyecto de **Solar Project Manager** solamente cuando se cumplan simultáneamente tres condiciones: el ticket de Soporte corresponde al mismo identificador externo de proyecto, el usuario autenticado tiene acceso al proyecto en Solar Project Manager y el correo corporativo normalizado del usuario coincide con el destinatario operativo definido para el ticket.

El identificador que ya existe en ambas aplicaciones no es el ID interno numérico de Solar Project Manager. El Sistema de Soporte guarda `tickets.project_id` como ID de OpenSolar, y Solar Project Manager conserva ese mismo valor en `projects.openSolarId`. Por tanto, la relación correcta es:

> **`Soporte.tickets.project_id` = `Solar Project Manager.projects.openSolarId`**

No conviene usar `Solar Project Manager.projects.id` como sustituto automático. Ambos valores pueden ser numéricos, pero pertenecen a espacios de identificación distintos y una coincidencia accidental podría mostrar un aviso en el proyecto equivocado. [1] [2] [3]

## Regla exacta de asociación por número de ticket

El formato actual del Sistema de Soporte ofrece una asociación clara y suficiente. Cada `ticket_id` se construye con el ID de OpenSolar del proyecto, un guion y un consecutivo de tres dígitos. Por ejemplo, `9255866-001` identifica el primer ticket asociado al proyecto OpenSolar `9255866`; `9255866-002` identifica el segundo ticket de ese mismo proyecto.

La integración **no debe partir el número del ticket para encontrar el proyecto**, porque el campo estructurado `Ticket.project_id` ya contiene el ID de OpenSolar y es la fuente confiable para filtrar. El formato del número debe usarse para presentación, trazabilidad y validaciones de consistencia. En términos operativos, la consulta correcta es:

```text
Soporte: SELECT tickets WHERE tickets.project_id = SPM.projects.openSolarId
```

Después de resolver el proyecto mediante ese ID compartido, se compara el correo del técnico asignado en Soporte con el correo de la sesión actual de Solar Project Manager. Solo entonces se devuelve el aviso. Así, para el proyecto con `openSolarId = 9255866`, el usuario `tecnico@greenhproject.com` verá `9255866-001` y `9255866-002` únicamente si es el responsable asignado de cada ticket activo. Otro usuario, aun cuando pueda consultar el mismo proyecto, no verá esos tickets.

Si un ticket está activo pero todavía no tiene técnico asignado, no se muestra a nadie por defecto. Esta regla evita dar visibilidad o responsabilidad implícita a un usuario que no fue asignado. Al asignarse, el siguiente resumen mostrará el ticket al responsable correspondiente; al reasignarse o cerrarse, deja de aparecer al responsable anterior.

## Resultado visible para el usuario

En la cabecera del detalle de proyecto, bajo el estado actual, aparecerá una tarjeta compacta, responsive y accesible cuando el usuario tenga tickets activos asociados. Para un solo caso, el texto será **“Tienes un ticket de servicio pendiente de atención”**. Si existen varios, la tarjeta mostrará el total y una lista breve de los tickets que ese mismo usuario puede abrir.

La tarjeta usará una jerarquía visual clara. Los tickets normales se mostrarán en color ámbar discreto; los de prioridad alta o crítica utilizarán una variante de atención reforzada. Cada entrada podrá incluir número de ticket, estado, prioridad y un enlace **“Abrir en Soporte”**. El enlace abrirá la aplicación de Soporte, que conservará su propia autenticación y sus propios controles de acceso. No se mostrarán descripción, comentarios, adjuntos, datos del cliente ni información de terceros dentro de Solar Project Manager.

La ausencia de un aviso significa que no existe un ticket activo conocido y asignado a ese usuario para el proyecto. La carga del proyecto no debe quedar bloqueada si la integración está temporalmente indisponible.

## Regla de visibilidad y destinatarios

La frase “solo al usuario en cuestión” debe convertirse en una regla de servidor, no en una condición visual del navegador. La propuesta base considera que el destinatario es el **responsable asignado del ticket** en Soporte (`assigned_to`), cuya cuenta se resuelve por correo corporativo. Solar Project Manager debe comparar el correo autenticado contra ese correo de forma normalizada: sin espacios y en minúsculas.

El sistema debe aplicar estas comprobaciones en este orden:

1. Solar Project Manager valida que el usuario autenticado puede abrir el proyecto con sus reglas actuales de rol, asignación de proyecto o hito.
2. El servicio consulta o lee únicamente tickets cuyo `project_id` sea exactamente igual a `project.openSolarId`.
3. La respuesta se filtra por la identidad del usuario autenticado. El navegador no podrá enviar ni modificar un correo destinatario.
4. El aviso se entrega solo si la identidad coincide con el responsable actual del ticket y el ticket permanece activo.

Los estados `new`, `assigned`, `in_progress`, `waiting` y `escalated` se consideran activos. Los estados `resolved` y `closed` eliminan el aviso. Si el ticket queda sin responsable, no se muestra a ningún usuario por defecto; este comportamiento es el más seguro y evita asignar visualmente una responsabilidad inexistente. [1]

Los administradores que pueden ver todos los proyectos no deben saltarse el filtro de correo. Podrán ver el proyecto por sus permisos actuales, pero no un ticket personal de otra persona. Esto preserva el requisito de confidencialidad incluso frente a roles con visibilidad global de proyectos. [4]

Si se desea que también lo vea el cliente que reportó el caso o la persona que lo creó, debe emitirse una relación separada para cada destinatario. No se debe reutilizar el aviso operativo del técnico ni revelar el título, prioridad o progreso interno del ticket a un cliente sin definir antes la política de contenido.

## Alternativas viables

| Enfoque | Tradeoffs | Costo | Complejidad de puesta en marcha |
|---|---|---:|---:|
| **Consulta firmada en tiempo real** | Solar Project Manager solicita a Soporte, desde su servidor, el resumen mínimo de tickets para el proyecto y el usuario autenticado cada vez que se abre el detalle. Es la alternativa más corta, pero añade una llamada entre plataformas y depende de la disponibilidad de Soporte durante la navegación. | Sin servicios adicionales; consume las solicitudes habituales de Railway. | Baja a media. Requiere un endpoint firmado en Soporte y una consulta protegida en Solar Project Manager. |
| **Eventos firmados con proyección local** | Soporte envía un evento tras crear, asignar, actualizar, resolver o cerrar un ticket. Solar Project Manager guarda una copia mínima de estado y muestra el aviso sin depender de una llamada remota al abrir el proyecto. Requiere auditoría, reintentos e idempotencia, pero es más rápido y resistente. | Sin servicios adicionales; usa procesos y bases de datos ya desplegados. | Media a alta. Requiere receptor de eventos, tabla local, cola de entrega y pruebas de recuperación. |
| **Eventos firmados más conciliación controlada** | Añade a la alternativa anterior una sincronización administrativa para recuperar eventos que no pudieron entregarse o asociaciones creadas antes de activar la integración. Da el mejor control operativo, a cambio de una fase adicional. | Sin servicios adicionales si se ejecuta como tarea periódica del backend; costo operativo bajo. | Alta. Debe incluir métricas, reintentos escalonados y una acción administrativa segura. |

La primera alternativa es adecuada para validar la experiencia rápidamente. La segunda satisface mejor una integración duradera, porque la interfaz de proyectos no queda expuesta a fallos, latencia o reinicios del backend de Soporte. La tercera agrega resiliencia para operación de largo plazo.

## Contrato recomendado para la alternativa basada en eventos

El Sistema de Soporte enviaría solicitudes `POST` al receptor de Solar Project Manager, por ejemplo `POST /api/integrations/support/ticket-events`. Este receptor debe ser una ruta REST de servidor a servidor, no un procedimiento tRPC de usuario.

Cada evento se firmará usando el mismo patrón HMAC-SHA256 que Green House Project ya utiliza para el Centro de Notificaciones. La firma se calcula sobre el cuerpo UTF-8 exacto recibido, mediante `HMAC-SHA256(secret, timestamp + "." + rawBody)`. Solar Project Manager debe rechazar fuentes desconocidas, firmas inválidas y timestamps con una diferencia mayor de cinco minutos. [5] [6]

Un evento mínimo podría tener esta forma:

```json
{
  "schemaVersion": "1.0",
  "eventId": "support:ticket:8177994-003:version:9",
  "eventType": "support.ticket.updated",
  "occurredAt": "2026-09-19T15:10:22.123Z",
  "ticket": {
    "ticketId": "8177994-003",
    "projectExternalId": "8177994",
    "assignedUserEmail": "ingeniero@greenhproject.com",
    "status": "in_progress",
    "priority": "high",
    "title": "Revisión de inversor",
    "active": true,
    "actionUrl": "https://soporte.ghp.center/tickets/8177994-003",
    "version": 9
  }
}
```

El campo `eventId` debe ser estable para un mismo cambio y único entre cambios. Una entrega repetida con el mismo `eventId` debe devolver una aceptación idempotente sin crear una segunda alerta. Los tipos `support.ticket.created`, `support.ticket.assigned`, `support.ticket.updated`, `support.ticket.resolved`, `support.ticket.closed`, `support.ticket.unassigned` y `support.ticket.deleted` pueden implementarse como eventos explícitos o representarse bajo `support.ticket.updated` con un estado y una versión inequívocos.

La aplicación de Soporte ya registra tickets con ID de proyecto, responsable, estado, prioridad y marca temporal. También tiene un adaptador HMAC que publica eventos al Centro de Notificaciones sin bloquear la acción de negocio, por lo que el patrón es compatible con su arquitectura actual. [1] [5]

## Persistencia mínima en Solar Project Manager

La proyección local no necesita copiar el expediente de soporte. Una tabla `support_ticket_links` puede contener los siguientes campos.

| Campo | Finalidad |
|---|---|
| `supportTicketId` | Identificador externo único del ticket, por ejemplo `8177994-003`. |
| `projectId` | ID interno de Solar Project Manager, resuelto a partir de `openSolarId`. |
| `projectExternalId` | ID de OpenSolar recibido para trazabilidad y diagnóstico. |
| `recipientEmailHash` | SHA-256 del correo normalizado; permite filtrar al usuario sin persistir el correo completo en la proyección. |
| `status`, `priority`, `title` | Resumen mínimo requerido para el aviso. El título debe ser opcional si se considera sensible. |
| `isActive`, `sourceVersion`, `sourceUpdatedAt` | Estado vigente y control de orden de eventos. |
| `actionUrl` | Enlace directo al ticket de Soporte, sin otorgar permisos adicionales. |
| `lastReceivedAt` | Fecha de recepción para diagnosticar sincronización obsoleta. |

Una segunda tabla `support_ticket_event_log` debe conservar `eventId` como valor único, tipo de evento, resultado, motivo de rechazo y hora de recepción. El payload puede conservarse de forma minimizada o con datos sensibles enmascarados. No deben persistirse el secreto HMAC, la firma, descripciones, comentarios, archivos ni correos completos en los logs.

Si se recibe un evento con un `projectExternalId` que no existe en `projects.openSolarId`, el receptor debe marcarlo como **no asociado** en la auditoría y devolver una respuesta segura. No debe crear automáticamente un proyecto ni asociarlo al primer ID interno numérico coincidente. Solar Project Manager ya cuenta con una búsqueda específica por `openSolarId`, lo que permite resolver esta relación de manera explícita. [3]

## Flujo de entrega y recuperación

La creación o modificación de un ticket debe completar primero su transacción local en Soporte. Solo después se prepara el evento. El envío no puede retrasar ni revertir la creación, asignación o resolución del ticket.

Para evitar pérdidas cuando Solar Project Manager esté temporalmente fuera de línea, Soporte debe insertar el evento en una tabla de salida dentro de la misma transacción de negocio. Un trabajador de fondo intentará entregar los eventos pendientes con reintentos escalonados. Cada intento quedará registrado con fecha, respuesta HTTP y error sanitizado. Esta “bandeja de salida” es más confiable que un hilo efímero porque los intentos sobreviven reinicios de la aplicación.

Solar Project Manager validará el evento, lo aplicará de forma idempotente y registrará el resultado. La interfaz leerá exclusivamente su proyección local. Como complemento, una acción administrativa de **Conciliar tickets de servicio** podrá solicitar un resumen firmado para recuperar asociaciones pendientes, después de una revisión de datos. La conciliación debe ser una tarea del backend administrado, no una consulta programada mediante sesiones de IA.

## Endpoint interno que consume la interfaz

El frontend de Solar Project Manager no debe llamar directamente al backend de Soporte ni conocer secretos de integración. La página `ProjectDetail` consultará un procedimiento interno, por ejemplo `supportTickets.forProject({ projectId })`.

Ese procedimiento seguirá esta secuencia:

1. Obtiene el proyecto y reutiliza exactamente la misma comprobación de permisos de `projects.getById`.
2. Normaliza el correo de `ctx.user` en el servidor y calcula su hash.
3. Busca tickets activos de `support_ticket_links` para el `projectId` y el hash del usuario.
4. Devuelve solamente un resumen de presentación: cantidad, ID de ticket, estado, prioridad, título opcional y URL de acción.
5. Si no hay registros, devuelve una colección vacía. Si la tabla no está disponible o contiene información obsoleta, no bloquea la vista del proyecto y registra el problema para diagnóstico administrativo.

El componente visual debe colocarse inmediatamente debajo de las insignias de estado del proyecto en `ProjectDetail.tsx`. Usará el sistema de tarjetas, badges, iconos y diseño mobile-first que ya existe en la aplicación. [4]

## Seguridad, privacidad y auditoría

La conexión debe usar un secreto HMAC distinto del usado por otras integraciones. Debe existir una clave de origen dedicada, por ejemplo `support-platform`, y dos variables privadas en ambos despliegues: una URL de receptor y un secreto de firma. Estos valores se configurarán como variables de Railway; no se guardarán en código, documentación pública ni variables `VITE_*`.

La identidad del destinatario se decide en el servidor de Soporte y se vuelve a comprobar en el servidor de Solar Project Manager. Un correo recibido desde el navegador nunca se considera evidencia de acceso. Los valores se normalizan con `trim().toLowerCase()`, se rechazan vacíos y no se usan los nombres de usuario como clave de identidad.

El receptor limitará el tamaño del cuerpo, validará el esquema, aplicará límite de frecuencia por fuente y responderá sin filtrar detalles sobre proyectos inexistentes. Un error de firma, una asociación inexistente o un evento duplicado se conservarán en auditoría. El panel de administración podrá mostrar conteos de eventos aceptados, duplicados, no asociados, reintentados y fallidos, además de la fecha de la última sincronización válida.

## Validaciones previas a desarrollar

Antes de construir cualquiera de las alternativas, conviene ejecutar una auditoría de cobertura. Debe confirmar que cada proyecto de Solar Project Manager que se espera vincular tiene un `openSolarId` no vacío y único, y que los tickets de Soporte usan ese mismo ID. También debe medir cuántos tickets activos no tienen responsable y cuántos responsables no tienen correo corporativo equivalente en Solar Project Manager.

La decisión funcional necesaria es el conjunto de destinatarios. La propuesta base usa el responsable técnico asignado al ticket. Si el objetivo incluye también al cliente o a quien abrió el ticket, se debe definir qué mensaje y qué campos puede recibir cada perfil. Esa definición es necesaria antes de implementar el contrato, porque determina si se emite una sola proyección o varias por ticket.

## Plan de implementación

La primera fase definirá el contrato versionado, las claves de integración y las pruebas de firma. Se añadirá una auditoría de coincidencias entre `Ticket.project_id` y `projects.openSolarId`, sin modificar tickets ni proyectos existentes.

La segunda fase añadirá al backend de Soporte la emisión posterior al commit, la tabla de salida y los eventos de creación, asignación, actualización, resolución, cierre y reasignación. Los reintentos serán no bloqueantes y quedarán auditados.

La tercera fase añadirá en Solar Project Manager el receptor firmado, las tablas de proyección y auditoría, la idempotencia, la resolución estricta por `openSolarId` y el procedimiento interno de lectura por `projectId` y usuario autenticado.

La cuarta fase incorporará la tarjeta visual en el detalle de proyecto. Se probarán los estados vacío, un ticket, múltiples tickets, prioridad alta, ticket resuelto y servicio remoto no disponible. La interfaz nunca recibirá correos ni permisos desde el cliente.

La quinta fase agregará diagnóstico administrativo y conciliación controlada. La activación en producción se hará con un ticket de prueba asociado a un proyecto que tenga `openSolarId`, asignado a una cuenta de prueba con el mismo correo en ambas plataformas. Después se verificará la aparición, reasignación, resolución, reintento y ausencia de visibilidad para otro usuario.

## Criterios de aceptación

La mejora estará completa cuando un ticket activo asociado por ID de OpenSolar aparezca únicamente al usuario destinatario correcto dentro del detalle del proyecto correspondiente. Un usuario con acceso al mismo proyecto pero correo distinto no podrá ver el aviso ni consultar sus metadatos. Un ticket resuelto, cerrado, eliminado o reasignado dejará de mostrarse al destinatario anterior.

La creación y actualización de tickets seguirá funcionando si Solar Project Manager no está disponible. Los eventos se podrán reintentar de forma segura, un reenvío no duplicará avisos y todos los resultados de entrega y recepción quedarán trazables. El detalle de proyecto mantendrá su carga normal incluso cuando la integración tenga un error.

## Referencias

[1]: https://github.com/greenhproject/soporte-backend-ghp/blob/main/src/models/ticket.py "Modelo Ticket del Sistema de Soporte Green House Project"
[2]: https://github.com/greenhproject/soporte-backend-ghp/blob/main/src/routes/tickets.py "Creación de tickets y uso del ID de OpenSolar"
[3]: https://github.com/greenhproject/solar-project-manager/blob/main/drizzle/schema.ts "Esquema de proyectos de Solar Project Manager"
[4]: https://github.com/greenhproject/solar-project-manager/blob/main/server/routers.ts "Autorización de detalle de proyectos en Solar Project Manager"
[5]: https://github.com/greenhproject/soporte-backend-ghp/blob/main/src/services/ghp_notification_hub.py "Adaptador HMAC del Sistema de Soporte"
[6]: https://github.com/greenhproject/solar-project-manager/blob/main/server/ghpNotificationHub.ts "Adaptador HMAC de Solar Project Manager"
