# Integración SPM → Centro de Notificaciones GHP Hub

**Aplicación:** Solar Project Manager (SPM)  
**Identificador de módulo:** `solar-project-manager`  
**Dominio de producción:** `https://spm.ghp.center`  
**Repositorio:** `github.com/greenhproject/solar-project-manager`  
**Fecha de implementación:** 14 de agosto de 2026  
**Autor:** Green House Project — Equipo de Desarrollo

---

## 1. Descripción general

Solar Project Manager emite eventos firmados al Centro de Notificaciones GHP Hub cada vez que ocurre una acción relevante para un usuario del ecosistema. Los eventos siguen el contrato HTTP definido en la Guía de despliegue del Centro de Notificaciones GHP (v1.0) y se envían como `POST` a `https://ghp.center/api/integrations/notifications`.

La integración es **no bloqueante**: si el Hub no está disponible o rechaza el evento, la operación de negocio en SPM no se ve afectada. Todos los errores se registran en consola con el prefijo `[GHP Hub]`.

---

## 2. Eventos emitidos

SPM emite los siguientes tipos de eventos al Hub:

| `eventType` | `severity` | `status` | Disparador en SPM | Descripción |
|---|---|---|---|---|
| `milestone.assigned` | `info` | `open` | Creación de un hito en un proyecto | Notifica al ingeniero asignado que tiene un nuevo hito. |
| `milestone.due_soon` | `warning` | `open` | Cron de recordatorios (hitos próximos a vencer) | Alerta al responsable que el hito está por vencer. |
| `milestone.overdue` | `critical` | `open` | Cron de recordatorios (hitos vencidos) | Escala visualmente el pendiente a nivel crítico. |
| `milestone.rescheduled` | `warning` | `open` | Reprogramación de fecha por admin/ingeniero | Informa al responsable que la fecha cambió. |
| `milestone.completed` | `info` | `resolved` | Hito marcado como completado | **Resuelve** el pendiente en el Hub (desaparece del contador). |
| `project.assigned` | `info` | `open` | Creación de proyecto con ingeniero asignado | Notifica al ingeniero que tiene un nuevo proyecto. |

---

## 3. Formato del `eventId`

Cada evento usa un identificador estable que se mantiene durante todo el ciclo de vida del objeto:

```
spm:milestone:<id>:attention    → Para hitos (ej: spm:milestone:284:attention)
spm:project:<id>:attention      → Para proyectos (ej: spm:project:15:attention)
```

El mismo `eventId` se reutiliza cuando el hito pasa de `assigned` → `due_soon` → `overdue` → `completed`. Esto garantiza que el Hub actualice el mismo pendiente sin duplicar contadores.

---

## 4. Ciclo de vida de un pendiente típico

```
1. Se crea un hito asignado a ingeniero@greenhproject.com
   → SPM envía: milestone.assigned (severity: info, status: open)
   → Hub: Crea pendiente, badge +1

2. El hito está a 3 días de vencer
   → SPM envía: milestone.due_soon (severity: warning, status: open)
   → Hub: Actualiza mismo pendiente a ámbar

3. El hito vence sin completarse
   → SPM envía: milestone.overdue (severity: critical, status: open)
   → Hub: Escala a rojo, mismo pendiente

4. El ingeniero completa el hito
   → SPM envía: milestone.completed (severity: info, status: resolved)
   → Hub: Retira el pendiente, badge -1
```

---

## 5. Estructura del adaptador

El adaptador se encuentra en `server/ghpNotificationHub.ts` y expone las siguientes funciones:

| Función | Uso |
|---|---|
| `notifyGhpHub(event)` | Función base que firma y envía cualquier evento al Hub. |
| `notifyMilestoneAssigned(params)` | Helper de alto nivel para hito asignado. |
| `notifyMilestoneDueSoon(params)` | Helper para hito próximo a vencer. |
| `notifyMilestoneOverdue(params)` | Helper para hito vencido. |
| `notifyMilestoneCompleted(params)` | Helper para hito completado (resuelve pendiente). |
| `notifyMilestoneRescheduled(params)` | Helper para hito reprogramado. |
| `notifyProjectAssigned(params)` | Helper para proyecto asignado. |
| `generateSignature(secret, timestamp, body)` | Genera firma HMAC-SHA256 (exportada para testing). |
| `buildMilestoneEventId(id)` | Construye eventId estable para hitos. |
| `buildProjectEventId(id)` | Construye eventId estable para proyectos. |

---

## 6. Variables de entorno requeridas

Estas variables deben configurarse en el entorno de producción de SPM (Railway):

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GHP_NOTIFICATION_HUB_URL` | URL base del Hub | `https://ghp.center` |
| `GHP_NOTIFICATION_SOURCE_KEY` | Identificador del módulo generado por el Hub | `solar-project-manager` |
| `GHP_NOTIFICATION_SIGNING_SECRET` | Secreto HMAC generado por el Hub (nunca exponer) | `(valor aleatorio de 32+ caracteres)` |

Si alguna de estas variables no está configurada, el adaptador omite silenciosamente todos los eventos sin generar errores.

---

## 7. Puntos de integración en el código

| Archivo | Línea aprox. | Evento emitido |
|---|---|---|
| `server/routers.ts` — `milestones.create` | ~1210 | `milestone.assigned` para el responsable del hito o, como respaldo, el ingeniero del proyecto. |
| `server/routers.ts` — `milestones.assignResponsible` | ~1810 | `milestone.assigned` para el responsable seleccionado. Es el punto principal de asignación manual. |
| `server/routers.ts` — `milestones.update` (status=completed) | ~1340 | `milestone.completed` (resolved) |
| `server/routers.ts` — `milestones.requestReschedule` | ~1590 | `milestone.rescheduled` |
| `server/routers.ts` — `projects.create` | ~730 | `project.assigned` |
| `server/routers.ts` — `notifications.checkAndCreateAutoNotifications` | ~2930 | `milestone.due_soon` y `milestone.overdue`, junto con la alerta local. |
| `server/routes/milestone-reminders.ts` — cron diario | ~170 | `milestone.overdue`, independiente del resultado del email. |

---

## 8. Seguridad

La firma se calcula según el contrato del Hub:

```
signature = HMAC-SHA256(signing_secret, timestamp + "." + json_body)
```

Los headers enviados en cada request son:

```
Content-Type: application/json
X-GHP-Source: <GHP_NOTIFICATION_SOURCE_KEY>
X-GHP-Timestamp: <unix_seconds>
X-GHP-Signature: <hex_hmac>
```

La ventana de validez del timestamp es de 5 minutos. El Hub debe rechazar eventos con timestamps fuera de esta ventana.

---

## 9. Activación paso a paso

Para activar la integración en producción:

1. En **GHP Hub → Configuración → Notificaciones**, generar la clave para el módulo "Solar Project Manager".
2. Copiar los valores: `SOURCE_KEY` y `SIGNING_SECRET`.
3. En **Railway** (servicio SPM), agregar las 3 variables de entorno:
   - `GHP_NOTIFICATION_HUB_URL=https://ghp.center`
   - `GHP_NOTIFICATION_SOURCE_KEY=<valor del paso 2>`
   - `GHP_NOTIFICATION_SIGNING_SECRET=<valor del paso 2>`
4. Redeplegar SPM en Railway.
5. En SPM, abrir **Configuración → Notificaciones Automáticas** y pulsar **Enviar prueba**. El resultado debe indicar HTTP 2xx y aparecer en el Hub.

---

## 10. Prueba de aceptación

| Paso | Acción | Resultado esperado |
|---|---|---|
| 1 | En Configuración → Notificaciones Automáticas, pulsar **Enviar prueba** | SPM muestra el HTTP de aceptación y el Hub recibe la prueba para el correo del admin. |
| 2 | Asignar responsable a un hito | Hub muestra "Nuevo hito asignado" al correo del responsable. |
| 3 | Ejecutar **Verificación** para un hito próximo | SPM crea la alerta local y envía `milestone.due_soon` al Hub. |
| 4 | Completar el hito | Hub retira el pendiente (badge -1). |
| 5 | Reprogramar otro hito | Hub muestra "Hito reprogramado" con severity warning. |

---

## 11. Diagnóstico

| Síntoma | Causa probable | Solución |
|---|---|---|
| No llegan eventos al Hub | Variables de entorno no configuradas | Verificar las 3 variables en Railway |
| `401 Unauthorized` en logs | Secreto incorrecto o rotado | Regenerar clave en Hub y actualizar en Railway |
| Eventos duplicados | Se está generando un eventId diferente | Verificar que se usa `buildMilestoneEventId(id)` |
| El badge no baja al completar | No se envía `status: "resolved"` | Verificar que `milestone.completed` usa `resolved` |
| Estado **no configurado** en SPM | Falta alguna variable de entorno | La pantalla indica exactamente cuál de las 3 variables falta. |
| Último intento `skipped` | Configuración incompleta | Corregir las variables en Railway y repetir la prueba controlada. |
| Último intento `failed` | El Hub rechazó el evento o no fue alcanzable | Revisar código HTTP y error en Configuración → Notificaciones Automáticas. |
| No hay registro de entrega | El flujo local no estaba conectado al Hub | Usar la versión que emite desde `assignResponsible` y la verificación automática. |

---

## 12. Tests

Los tests unitarios se encuentran en `server/ghpNotificationHub.test.ts` (15 tests):

```bash
npx vitest run server/ghpNotificationHub.test.ts
```

Cubren: generación de firma HMAC-SHA256, estabilidad de eventIds, formato de eventos y diagnóstico de variables de configuración.

## 13. Observabilidad y auditoría

Cada intento de envío se registra en la tabla `ghp_notification_delivery_logs`, sin almacenar secretos ni firmas. Se conserva el tipo de evento, correo destinatario, resultado (`sent`, `failed` o `skipped`), código HTTP, mensaje de error, duración y payload enviado.

La vista administrativa **Configuración → Notificaciones Automáticas** consulta los últimos 15 registros y ofrece una prueba controlada. Esta trazabilidad permite diferenciar una falla de configuración, conectividad, firma o validación en el Hub sin depender de logs efímeros de Railway.

---

## 14. Receptor en el Hub

Para que el Hub procese los eventos de SPM, debe implementar:

1. **Endpoint:** `POST /api/integrations/notifications`
2. **Validación de firma:** Recalcular HMAC-SHA256 con el secreto del módulo y comparar con `X-GHP-Signature`.
3. **Validación de timestamp:** Rechazar si `|now - X-GHP-Timestamp| > 300 segundos`.
4. **Validación de fuente:** Verificar que `X-GHP-Source` corresponde a un módulo registrado.
5. **Upsert idempotente:** Usar `sourceModuleId + eventId` como clave única.
6. **Respuesta:** `202 Accepted` en caso de éxito.

El Hub debe manejar los campos `status: "open"` (crear/actualizar pendiente) y `status: "resolved"` (retirar pendiente de contadores activos).
