# Guía reutilizable de integración con el Centro de Notificaciones GHP

**Versión:** 1.0  
**Fecha:** 15 de agosto de 2026  
**Autor:** Manus AI  
**Audiencia:** Equipos que desarrollan aplicaciones del ecosistema Green House Project

---

## 1. Propósito y resultado esperado

Esta guía describe cómo conectar cualquier aplicación del ecosistema GHP al **Centro de Notificaciones GHP** para que los eventos relevantes se centralicen en una única bandeja, campana y contador de pendientes. El patrón fue validado en Solar Project Manager (SPM): un evento se dirige al usuario responsable, se firma con HMAC-SHA256, el Hub lo procesa de forma idempotente y la aplicación de origen conserva una auditoría del intento de entrega.[1]

> **Principio de diseño:** la operación de negocio debe completarse aunque el Hub no esté disponible. La notificación es una integración secundaria, observable y recuperable; nunca debe impedir crear un proyecto, asignar una tarea o completar un proceso.

Al finalizar la integración, la aplicación deberá poder emitir eventos abiertos, elevar su severidad durante el ciclo de vida y resolver el mismo pendiente cuando la acción se complete.

| Componente | Responsabilidad |
|---|---|
| Aplicación emisora | Detecta eventos, determina el responsable real, construye y firma el payload, registra el resultado. |
| Centro de Notificaciones GHP | Valida fuente, timestamp y firma; crea o actualiza el pendiente de forma idempotente. |
| Administrador de la aplicación | Configura secretos, ejecuta una prueba controlada y consulta los últimos intentos. |
| Usuario responsable | Recibe en el Hub solo los eventos vinculados a su correo de identidad. |

---

## 2. Arquitectura de referencia

La implementación recomendada es un adaptador de servidor. El cliente web no debe conocer ni la clave de módulo ni el secreto de firma.

```text
Acción de negocio
        │
        ▼
Commit en base de datos ──► Adaptador de notificaciones ──► POST firmado al Hub
        │                         │                              │
        │                         ├──► Log de auditoría           ├──► Upsert idempotente
        │                         └──► Resultado no bloqueante    └──► Bandeja / badge del usuario
        ▼
Respuesta normal de la aplicación
```

El adaptador debe ejecutarse **después** de persistir la acción. Así, cualquier evento que llegue al Hub representa un estado real de la aplicación. Si el envío falla, el usuario sigue recibiendo una respuesta válida de la operación principal y el fallo queda registrado para diagnóstico.

---

## 3. Preparación y credenciales

Antes de desarrollar, se debe registrar el módulo de la aplicación en **GHP Hub → Configuración → Notificaciones**. El Hub debe generar un identificador de fuente y un secreto exclusivo por aplicación. Nunca se reutiliza el secreto de otro módulo.

| Variable de entorno | Propósito | Ejemplo seguro |
|---|---|---|
| `GHP_NOTIFICATION_HUB_URL` | URL base del Hub | `https://ghp.center` |
| `GHP_NOTIFICATION_SOURCE_KEY` | Identificador de fuente emitido por el Hub | `mi-aplicacion-ghp` |
| `GHP_NOTIFICATION_SIGNING_SECRET` | Secreto HMAC privado | Valor aleatorio generado por el Hub |

En Railway u otro proveedor, las tres variables se agregan como secretos del servicio de la aplicación emisora. No deben ponerse en repositorios, archivos `.env` versionados, variables de frontend ni capturas de pantalla.

---

## 4. Contrato HTTP estándar

La aplicación emisora debe realizar un `POST` a:

```text
https://ghp.center/api/integrations/notifications
```

Los encabezados requeridos son los siguientes:

```http
Content-Type: application/json
X-GHP-Source: <GHP_NOTIFICATION_SOURCE_KEY>
X-GHP-Timestamp: <unix_seconds>
X-GHP-Signature: <hex_hmac_sha256>
```

La firma se calcula sobre el cuerpo **exacto** serializado:

```text
signature = HMAC-SHA256(signing_secret, timestamp + "." + json_body)
```

El Hub debe verificar que el timestamp se encuentre dentro de una ventana corta, recomendada de cinco minutos, antes de comparar la firma. Esa validación evita ataques de repetición y rechaza solicitudes antiguas.[1]

### 4.1 Payload de evento

```json
{
  "eventId": "miapp:task:4826:attention",
  "recipientEmail": "responsable@greenhproject.com",
  "eventType": "task.assigned",
  "severity": "info",
  "title": "Nueva tarea asignada",
  "body": "Se te asignó la tarea \"Revisar propuesta\".",
  "status": "open",
  "externalEntityId": "4826",
  "actionUrl": "https://miapp.ghp.center/tasks/4826",
  "occurredAt": "2026-08-15T22:30:00.000Z",
  "metadata": {
    "projectName": "Proyecto ejemplo"
  }
}
```

| Campo | Requerido | Regla de uso |
|---|---:|---|
| `eventId` | Sí | Identificador estable, único dentro del módulo y entidad. |
| `recipientEmail` | Sí | Correo del responsable real; debe coincidir con su identidad en GHP Hub. |
| `eventType` | Sí | Tipo semántico de evento, por ejemplo `task.assigned`. |
| `severity` | Sí | `info`, `warning` o `critical`. |
| `title` y `body` | Sí | Texto claro, útil y accionable para el usuario. |
| `status` | Sí | `open` para crear/actualizar; `resolved` para retirar el pendiente. |
| `externalEntityId` | Recomendado | ID de la entidad dentro de la aplicación emisora. |
| `actionUrl` | Recomendado | Ruta directa que permite al usuario actuar sobre el evento. |
| `occurredAt` | Recomendado | Fecha ISO 8601 del evento. |
| `metadata` | Opcional | Contexto adicional no sensible para el Hub. |

El Hub responde `202 Accepted` cuando acepta el evento. El emisor debe considerar exitoso cualquier código HTTP 2xx y registrar el código recibido.

---

## 5. Idempotencia y ciclo de vida

La clave para no inflar el contador de notificaciones es mantener el mismo `eventId` a lo largo del ciclo de vida de una entidad. El Hub debe aplicar un **upsert** usando la combinación `sourceModuleId + eventId`.[1]

| Momento del ciclo | `eventType` sugerido | `severity` | `status` | Efecto esperado en Hub |
|---|---|---|---|---|
| Se asigna trabajo | `task.assigned` | `info` | `open` | Crea el pendiente. |
| Se acerca el vencimiento | `task.due_soon` | `warning` | `open` | Actualiza el mismo pendiente. |
| Se vence | `task.overdue` | `critical` | `open` | Escala el mismo pendiente. |
| Se reprograma | `task.rescheduled` | `warning` | `open` | Actualiza texto, fecha y severidad. |
| Se completa/cierra | `task.completed` | `info` | `resolved` | Retira el pendiente activo. |

Un formato recomendado es:

```text
<modulo>:<entidad>:<id>:attention

ejemplo: crm:lead:123:attention
ejemplo: finance:invoice:77:attention
ejemplo: support:ticket:990:attention
```

No se debe incluir la fecha, el tipo de evento o un UUID aleatorio dentro del `eventId` de una misma entidad. Esos valores generarían pendient​es duplicados en vez de actualizar uno existente.

---

## 6. Implementación del adaptador de servidor

Cada aplicación debe tener un único módulo de integración, por ejemplo `server/ghpNotificationHub.ts`. El código de negocio debe llamar helpers de alto nivel, no construir headers ni firmas de forma repetida en cada router.

```ts
import crypto from "crypto";

type HubEvent = {
  eventId: string;
  recipientEmail: string;
  eventType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  status: "open" | "resolved";
  externalEntityId?: string;
  actionUrl?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
};

export async function deliverHubEvent(event: HubEvent) {
  const baseUrl = process.env.GHP_NOTIFICATION_HUB_URL?.replace(/\/+$/, "");
  const sourceKey = process.env.GHP_NOTIFICATION_SOURCE_KEY;
  const secret = process.env.GHP_NOTIFICATION_SIGNING_SECRET;
  const startedAt = Date.now();
  const body = JSON.stringify(event);

  if (!baseUrl || !sourceKey || !secret) {
    return { success: false, deliveryStatus: "skipped", error: "Configuración incompleta" };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(body)
    .digest("hex");

  try {
    const response = await fetch(`${baseUrl}/api/integrations/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GHP-Source": sourceKey,
        "X-GHP-Timestamp": timestamp,
        "X-GHP-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    return {
      success: response.ok,
      deliveryStatus: response.ok ? "sent" : "failed",
      responseStatus: response.status,
      durationMs: Date.now() - startedAt,
      error: response.ok ? undefined : await response.text(),
    };
  } catch (error) {
    return {
      success: false,
      deliveryStatus: "failed",
      durationMs: Date.now() - startedAt,
      error: (error as Error).message,
    };
  }
}
```

La función debe capturar errores y devolver un resultado estructurado. La capa de negocio puede registrar una advertencia, pero no debe relanzar la excepción ni revertir un commit exitoso.

---

## 7. Selección correcta del destinatario

Antes de enviar, se debe resolver el **responsable de la acción**, no asumir que siempre será el propietario del proyecto, la persona que creó el registro o el administrador.

La experiencia validada en SPM demostró un caso crítico: un hito tenía `assignedUserId`, el proyecto no tenía `assignedEngineerId`, y una primera implementación buscaba solo al ingeniero del proyecto. Como resultado, la alerta local se creaba, pero ningún evento se emitía hacia GHP Center. La regla reutilizable es:

```text
destinatario = responsable_directo ?? responsable_del_contenedor ?? sin_emisión
```

Para una tarea, esto equivale a `task.assignedUserId ?? project.ownerId`. Para un ticket, podría ser `ticket.assigneeId ?? queue.managerId`. Si no existe un destinatario con correo válido, se registra el motivo como `skipped`; no se debe mandar la alerta a un usuario arbitrario.

También se debe emitir en el **punto real de asignación**. Muchas aplicaciones crean una entidad y asignan el responsable en una operación posterior. En ese caso, el evento `*.assigned` pertenece al procedimiento de asignación, no solo al de creación.

---

## 8. Puntos de emisión que no se deben omitir

Cada aplicación debe elaborar una matriz de eventos antes de programar. La siguiente plantilla evita que las notificaciones locales y las centralizadas queden desconectadas.

| Flujo | Emisor recomendado | Evento al Hub | Validación clave |
|---|---|---|---|
| Crear entidad con responsable | Servicio de creación, después del commit | `*.assigned` | Resolver responsable directo. |
| Asignar o reasignar responsable | Servicio específico de asignación | `*.assigned` | Emitir incluso si la entidad ya existía. |
| Próximo vencimiento | Mismo proceso que crea alerta local | `*.due_soon` | Enviar al mismo usuario de la alerta local. |
| Vencimiento | Cron/scheduler de recordatorios | `*.overdue` | No depender de que el correo haya sido enviado. |
| Cambio de fecha | Servicio de reprogramación | `*.rescheduled` | Conservar el `eventId`. |
| Cierre o completado | Servicio de actualización de estado | `*.completed`, `resolved` | Resolver el pendiente activo. |
| Cancelación | Servicio de cancelación | `*.cancelled`, `resolved` | Evitar pendientes huérfanos. |

Si una aplicación ya tiene notificaciones internas, el adaptador del Hub debe ser llamado desde el mismo bloque transaccional posterior a la creación de esa alerta. Así las dos interfaces comunican el mismo evento y no generan versiones inconsistentes de la realidad.

---

## 9. Auditoría, diagnóstico y reintentos

La observabilidad es obligatoria. Un `console.warn` ayuda durante desarrollo, pero no permite entender un incidente ocurrido horas antes en producción. Se recomienda una tabla propia de auditoría.

| Campo de auditoría | Razón |
|---|---|
| `eventId`, `eventType`, `recipientEmail` | Permite rastrear quién debía recibir qué evento. |
| `deliveryStatus` | Distingue `sent`, `failed` y `skipped`. |
| `responseStatus`, `error` | Explica rechazo HTTP, firma inválida o error de red. |
| `durationMs` | Ayuda a detectar degradación de conectividad. |
| `payload` | Permite reproducir el contexto; nunca guardar secreto ni firma. |
| `createdAt` | Da trazabilidad temporal. |

SPM utiliza `ghp_notification_delivery_logs` y muestra los últimos intentos en **Configuración → Notificaciones Automáticas**. Toda aplicación nueva debería ofrecer una vista administrativa equivalente con tres elementos: estado de variables, último intento y una prueba controlada.

La prueba debe ser exclusiva para administradores y enviar a su propio correo de sesión. Debe generar un `eventId` de prueba único, por ejemplo `miapp:test:<timestamp>:attention`, para no sobrescribir un pendiente real.

Para volúmenes altos o eventos críticos, se recomienda evolucionar de envío directo a un patrón **outbox**: guardar el evento junto con la transacción de negocio, procesarlo con un worker y reintentar con backoff. La auditoría actual sigue siendo necesaria; la outbox agrega garantía de recuperación ante caídas temporales del Hub.

---

## 10. Prueba de aceptación antes de liberar

La integración no debe declararse lista hasta completar esta validación en producción o preproducción con las variables reales configuradas.

| Paso | Acción | Evidencia de éxito |
|---|---|---|
| 1 | Confirmar las tres variables de entorno sin revelar sus valores. | Estado “configurado” en la consola administrativa. |
| 2 | Ejecutar la prueba controlada. | Log `sent`, respuesta HTTP 2xx y tarjeta en GHP Center. |
| 3 | Asignar una entidad a un usuario existente en Hub. | Evento llega al correo del responsable correcto. |
| 4 | Activar una alerta próxima a vencer. | Se registra alerta local y evento `*.due_soon` en Hub. |
| 5 | Forzar vencimiento o ejecutar cron controlado. | Hub actualiza el mismo evento como `critical`. |
| 6 | Completar/cerrar la entidad. | Hub recibe `resolved` y el contador disminuye. |
| 7 | Revisar auditoría. | Cada intento posee resultado, duración y código HTTP cuando aplica. |

Además de los ensayos funcionales, se deben mantener tests unitarios para la firma HMAC, formato del `eventId`, estado de configuración y tipos de payload. Los tests no reemplazan la prueba con el Hub real; ambas son necesarias.

---

## 11. Diagnóstico rápido

| Síntoma | Causa frecuente | Acción correctiva |
|---|---|---|
| No aparece nada en Hub y no hay log | El flujo no llama al adaptador. | Revisar la matriz de puntos de emisión, especialmente asignaciones posteriores. |
| Log `skipped` | Faltan variables. | Configurar las tres variables en el servicio y redeplegar. |
| `401` o `403` | Fuente no registrada o secreto rotado. | Regenerar clave en Hub y actualizar el secreto en el emisor. |
| `400` o `422` | Payload inválido. | Revisar campos requeridos, tipo de `status` y formato de correo. |
| `408`, timeout o error de red | Hub no accesible o latencia. | Revisar URL, DNS, health del Hub y aplicar reintento si corresponde. |
| Eventos duplicados | `eventId` cambia por cada transición. | Construir `eventId` estable por entidad. |
| Badge no disminuye | No se emitió `status: resolved`. | Incluir evento de cierre/completado/cancelación. |
| Usuario equivocado o sin aviso | Se tomó dueño del contenedor en lugar del asignado. | Aplicar la regla responsable directo → respaldo → omitir. |

---

## 12. Lista de verificación para replicar en otra aplicación

- [ ] Registrar el módulo y generar claves exclusivas en GHP Hub.
- [ ] Declarar las tres variables de entorno solo en el servidor.
- [ ] Crear un adaptador centralizado que genere firma HMAC y timeout.
- [ ] Definir `eventId` estable por tipo de entidad e implementar upsert en el Hub.
- [ ] Mapear cada transición de negocio y el responsable real.
- [ ] Emitir después del commit y no bloquear la operación de negocio.
- [ ] Registrar todos los intentos de envío en auditoría persistente.
- [ ] Crear una prueba controlada restringida a administradores.
- [ ] Validar asignación, vencimiento, reprogramación y resolución.
- [ ] Documentar variables, eventos, destinatarios y rutas de diagnóstico.

---

## Referencias

[1]: ./integracion-ghp-notification-hub.md "Implementación validada: Solar Project Manager → Centro de Notificaciones GHP"
