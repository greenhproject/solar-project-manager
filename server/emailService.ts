/**
 * Servicio de envío de emails con configuración dinámica
 * Soporta Resend, SendGrid y SMTP genérico
 * La configuración se obtiene de la tabla email_config en la BD
 */

import { getEmailConfig } from "./db";
import { getConfiguredTimezone } from "./timezone";

// Cache de configuración (se refresca cada 5 minutos)
let cachedConfig: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }
  try {
    cachedConfig = await getEmailConfig();
    cacheTimestamp = now;
  } catch (e) {
    console.warn("[Email] No se pudo obtener configuración de email:", e);
  }
  return cachedConfig;
}

/**
 * Invalida el cache de configuración (llamar después de actualizar config)
 */
export function invalidateEmailConfigCache() {
  cachedConfig = null;
  cacheTimestamp = 0;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un email usando el proveedor configurado por el admin
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  const config = await getConfig();

  if (!config || !config.isActive || !config.enableEmailNotifications) {
    console.warn("[Email] Servicio de email no configurado o desactivado");
    return false;
  }

  try {
    switch (config.provider) {
      case "resend":
        return await sendViaResend(config, to, subject, html);
      case "sendgrid":
        return await sendViaSendGrid(config, to, subject, html);
      case "smtp":
        return await sendViaSMTP(config, to, subject, html);
      default:
        console.error("[Email] Proveedor no soportado:", config.provider);
        return false;
    }
  } catch (error) {
    console.error("[Email] Error al enviar email:", error);
    return false;
  }
}

/**
 * Enviar via Resend API
 */
async function sendViaResend(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!config.apiKey) {
    console.error("[Email] Resend API Key no configurada");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Email] Resend error:", error);
    return false;
  }

  const data = await response.json();
  console.log("[Email] Resend email enviado:", data.id);
  return true;
}

/**
 * Enviar via SendGrid API
 */
async function sendViaSendGrid(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!config.apiKey) {
    console.error("[Email] SendGrid API Key no configurada");
    return false;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: config.fromEmail, name: config.fromName },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Email] SendGrid error:", error);
    return false;
  }

  console.log("[Email] SendGrid email enviado a:", to);
  return true;
}

/**
 * Enviar via SMTP genérico
 */
async function sendViaSMTP(
  config: any,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  // SMTP requiere nodemailer - se importa dinámicamente
  try {
    const nodemailer = await import("nodemailer");
    
    const transporter = nodemailer.default.createTransport({
      host: config.smtpHost,
      port: config.smtpPort || 587,
      secure: config.smtpSecure || false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log("[Email] SMTP email enviado a:", to);
    return true;
  } catch (error) {
    console.error("[Email] SMTP error:", error);
    return false;
  }
}

/**
 * Enviar email de prueba para verificar la configuración
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  const content = getEmailTemplate(`
    <div class="alert alert-success">
      <h2 style="margin-top: 0;">✅ Email de Prueba</h2>
      <p>Este es un email de prueba para verificar la configuración del servicio de correo.</p>
      <p><strong>Fecha:</strong> ${new Date().toLocaleString("es-CO", { timeZone: await getConfiguredTimezone() })}</p>
    </div>
    <p>Si recibes este email, la configuración del servicio de correo está funcionando correctamente.</p>
  `);

  return sendEmail({
    to,
    subject: "✅ Email de Prueba - Solar Project Manager",
    html: content,
  });
}

/**
 * Plantilla HTML base para emails
 */
function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solar Project Manager</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #f97316;
    }
    .header h1 {
      color: #f97316;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      color: #666;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #f97316;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 0;
    }
    .alert {
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .alert-warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
    }
    .alert-danger {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
    }
    .alert-success {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
    }
    .alert-info {
      background-color: #dbeafe;
      border-left: 4px solid #3b82f6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>☀️ Solar Project Manager</h1>
      <p style="margin: 5px 0 0 0; color: #666;">Green House Project</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Este es un email automático del Solar Project Manager.</p>
      <p>© ${new Date().getFullYear()} Green House Project. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email de recordatorio de hito (unificado para próximo a vencer y vencido)
 */
export async function sendMilestoneReminderEmail(params: {
  toEmail: string;
  toName: string;
  milestoneName: string;
  projectName: string;
  dueDate: Date;
  type: "due_soon" | "overdue";
}): Promise<boolean> {
  const { toEmail, toName, milestoneName, projectName, dueDate, type } = params;
  const { getNowInConfiguredTimezone: getNow } = await import("./timezone");
  const now = await getNow();
  const diffMs = type === "overdue"
    ? now.getTime() - dueDate.getTime()
    : dueDate.getTime() - now.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (type === "overdue") {
    const content = getEmailTemplate(`
      <div class="alert alert-danger">
        <h2 style="margin-top: 0;">🚨 Hito Vencido</h2>
        <p><strong>Proyecto:</strong> ${projectName}</p>
        <p><strong>Hito:</strong> ${milestoneName}</p>
        <p><strong>Fecha de vencimiento:</strong> ${dueDate.toLocaleDateString('es-CO', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: await getConfiguredTimezone() 
        })}</p>
        <p><strong>Días de retraso:</strong> ${days} ${days === 1 ? 'día' : 'días'}</p>
      </div>
      <p>Hola <strong>${toName}</strong>,</p>
      <p>El hito <strong>"${milestoneName}"</strong> del proyecto <strong>"${projectName}"</strong> está vencido.</p>
      <p>Por favor, actualiza el estado del hito lo antes posible.</p>
    `);

    return sendEmail({
      to: toEmail,
      subject: `🚨 Alerta: ${milestoneName} está vencido (${days} ${days === 1 ? 'día' : 'días'})`,
      html: content,
    });
  } else {
    const content = getEmailTemplate(`
      <div class="alert alert-warning">
        <h2 style="margin-top: 0;">⏰ Hito Próximo a Vencer</h2>
        <p><strong>Proyecto:</strong> ${projectName}</p>
        <p><strong>Hito:</strong> ${milestoneName}</p>
        <p><strong>Fecha de vencimiento:</strong> ${dueDate.toLocaleDateString('es-CO', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: await getConfiguredTimezone() 
        })}</p>
        <p><strong>Tiempo restante:</strong> ${days} ${days === 1 ? 'día' : 'días'}</p>
      </div>
      <p>Hola <strong>${toName}</strong>,</p>
      <p>Este es un recordatorio de que el hito <strong>"${milestoneName}"</strong> del proyecto <strong>"${projectName}"</strong> vence pronto.</p>
      <p>Por favor, asegúrate de completarlo a tiempo.</p>
    `);

    return sendEmail({
      to: toEmail,
      subject: `⏰ Recordatorio: ${milestoneName} vence en ${days} ${days === 1 ? 'día' : 'días'}`,
      html: content,
    });
  }
}

/**
 * Email para proyecto completado
 */
export async function sendProjectCompletedEmail(
  to: string,
  projectName: string,
  location: string,
  durationDays: number
): Promise<boolean> {
  const content = getEmailTemplate(`
    <div class="alert alert-success">
      <h2 style="margin-top: 0;">🎉 ¡Proyecto Completado!</h2>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Ubicación:</strong> ${location || 'No especificada'}</p>
      <p><strong>Duración total:</strong> ${durationDays} días</p>
    </div>
    <p>¡Felicidades! El proyecto <strong>"${projectName}"</strong> ha alcanzado el 100% de completitud.</p>
    <p>Todos los hitos han sido completados exitosamente.</p>
  `);

  return sendEmail({
    to,
    subject: `🎉 ¡Proyecto Completado! - ${projectName}`,
    html: content,
  });
}

/**
 * Email para proyecto asignado
 */
export async function sendProjectAssignedEmail(
  to: string,
  engineerName: string,
  projectName: string,
  location: string,
  startDate: Date
): Promise<boolean> {
  const content = getEmailTemplate(`
    <div class="alert alert-info">
      <h2 style="margin-top: 0;">📋 Nuevo Proyecto Asignado</h2>
      <p><strong>Ingeniero:</strong> ${engineerName}</p>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Ubicación:</strong> ${location || 'No especificada'}</p>
      <p><strong>Fecha de inicio:</strong> ${startDate.toLocaleDateString('es-CO', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: await getConfiguredTimezone() 
      })}</p>
    </div>
    <p>Se te ha asignado el proyecto <strong>"${projectName}"</strong>.</p>
    <p>Por favor, revisa los detalles y hitos del proyecto en el sistema.</p>
  `);

  return sendEmail({
    to,
    subject: `📋 Nuevo Proyecto Asignado: ${projectName}`,
    html: content,
  });
}

/**
 * Email genérico de notificación
 */
export async function sendGenericNotificationEmail(
  to: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'danger' | 'success' = 'info'
): Promise<boolean> {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    danger: '🚨',
    success: '✅',
  };

  const content = getEmailTemplate(`
    <div class="alert alert-${type}">
      <h2 style="margin-top: 0;">${icons[type]} ${title}</h2>
    </div>
    <p>${message}</p>
  `);

  return sendEmail({
    to,
    subject: `${icons[type]} ${title}`,
    html: content,
  });
}

/**
 * Email de invitación al portal del cliente
 * Envía un email profesional con instrucciones de acceso al portal
 */
export async function sendClientInvitationEmail(params: {
  toEmail: string;
  clientName: string;
  projectName: string;
  projectId: number;
  portalUrl: string;
  senderName: string;
}): Promise<boolean> {
  const { toEmail, clientName, projectName, projectId, portalUrl, senderName } = params;

  const content = getEmailTemplate(`
    <div class="alert alert-info">
      <h2 style="margin-top: 0;">🎉 ¡Bienvenido al Portal de Clientes!</h2>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>ID del Proyecto:</strong> #${projectId}</p>
    </div>
    
    <p>Hola <strong>${clientName || 'Estimado cliente'}</strong>,</p>
    
    <p>Le informamos que su proyecto de energía solar <strong>"${projectName}"</strong> ya está registrado en nuestro sistema de gestión. A partir de ahora podrá consultar el avance de su proyecto en tiempo real a través de nuestro portal de clientes.</p>
    
    <h3 style="color: #f97316; margin-top: 25px;">¿Cómo acceder?</h3>
    
    <ol style="padding-left: 20px; line-height: 2;">
      <li>Ingrese al portal: <a href="${portalUrl}" style="color: #f97316; font-weight: bold;">${portalUrl}</a></li>
      <li>Regístrese con este mismo correo electrónico: <strong>${toEmail}</strong></li>
      <li>Una vez registrado, su proyecto aparecerá automáticamente en su panel</li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${portalUrl}" class="button" style="color: #ffffff !important; text-decoration: none;">
        Acceder al Portal de Clientes
      </a>
    </div>
    
    <h3 style="color: #f97316; margin-top: 25px;">¿Qué puede hacer en el portal?</h3>
    <ul style="padding-left: 20px; line-height: 2;">
      <li>📊 Ver el progreso general de su proyecto</li>
      <li>📅 Consultar el cronograma y fechas estimadas</li>
      <li>✅ Revisar el estado de cada hito del proyecto</li>
      <li>📝 Recibir actualizaciones importantes</li>
    </ul>
    
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 15px; margin-top: 20px; border: 1px solid #e2e8f0;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        <strong>💡 Nota:</strong> Es importante que se registre con el correo <strong>${toEmail}</strong> para que el sistema vincule automáticamente su proyecto. Si tiene alguna duda, no dude en contactarnos.
      </p>
    </div>
    
    <p style="margin-top: 25px; color: #666;">
      Atentamente,<br/>
      <strong>${senderName}</strong><br/>
      Green House Project
    </p>
  `);

  return sendEmail({
    to: toEmail,
    subject: `🎉 ¡Bienvenido! Acceda al estado de su proyecto "${projectName}" - Green House Project`,
    html: content,
  });
}


/**
 * Email de evaluación de desempeño mensual
 * Envía felicitación o alerta de mejora según el score
 */
export async function sendPerformanceEvaluationEmail(params: {
  toEmail: string;
  engineerName: string;
  month: string;
  score: number;
  level: "excelente" | "bueno" | "regular" | "necesita_mejora";
  metrics: {
    totalAssigned: number;
    completedOnTime: number;
    completedLate: number;
    overdue: number;
    onTimeRate: number;
    completionRate: number;
  };
}): Promise<boolean> {
  const { toEmail, engineerName, month, score, level, metrics } = params;

  const levelConfig = {
    excelente: { icon: "🏆", color: "#16a34a", title: "¡Excelente Desempeño!", message: "Tu rendimiento este mes ha sido excepcional. ¡Sigue así!" },
    bueno: { icon: "👍", color: "#2563eb", title: "Buen Desempeño", message: "Tu rendimiento este mes ha sido bueno. Sigue mejorando." },
    regular: { icon: "⚠️", color: "#d97706", title: "Desempeño Regular", message: "Tu rendimiento este mes necesita atención. Revisa los hitos pendientes." },
    necesita_mejora: { icon: "🚨", color: "#dc2626", title: "Alerta: Necesitas Mejorar", message: "Tu rendimiento este mes está por debajo de lo esperado. Se requiere acción inmediata." },
  };

  const config = levelConfig[level];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const [year, monthNum] = month.split("-").map(Number);
  const monthName = `${monthNames[monthNum - 1]} ${year}`;

  const content = getEmailTemplate(`
    <div style="text-align: center; padding: 20px 0;">
      <div style="font-size: 48px;">${config.icon}</div>
      <h1 style="color: ${config.color}; margin: 10px 0;">${config.title}</h1>
      <p style="color: #666; font-size: 14px;">Evaluación de Desempeño - ${monthName}</p>
    </div>

    <p>Hola <strong>${engineerName}</strong>,</p>
    <p>${config.message}</p>

    <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 20px 0; text-align: center;">
      <div style="font-size: 56px; font-weight: bold; color: ${config.color};">${score}</div>
      <div style="font-size: 14px; color: #666; margin-top: 4px;">Score de Desempeño (0-100)</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #f1f5f9;">
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold;">Métrica</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: bold; text-align: center;">Resultado</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">Hitos asignados en el mes</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;">${metrics.totalAssigned}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">Completados a tiempo</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; color: #16a34a;">${metrics.completedOnTime}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">Completados con retraso</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; color: #d97706;">${metrics.completedLate}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">Hitos vencidos actualmente</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center; color: #dc2626;">${metrics.overdue}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">Tasa de cumplimiento a tiempo</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;">${metrics.onTimeRate}%</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #e2e8f0;">Tasa de completación</td>
        <td style="padding: 12px; border: 1px solid #e2e8f0; text-align: center;">${metrics.completionRate}%</td>
      </tr>
    </table>

    ${level === "necesita_mejora" || level === "regular" ? `
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <strong>Recomendaciones:</strong>
      <ul style="margin: 8px 0 0 0; padding-left: 20px;">
        ${metrics.overdue > 0 ? `<li>Tienes ${metrics.overdue} hito(s) vencidos. Prioriza su completación o solicita reprogramación con justificación.</li>` : ""}
        ${metrics.onTimeRate < 70 ? `<li>Tu tasa de cumplimiento a tiempo es ${metrics.onTimeRate}%. Revisa tu planificación y comunica bloqueos a tiempo.</li>` : ""}
        ${metrics.completionRate < 50 ? `<li>Solo completaste el ${metrics.completionRate}% de los hitos programados. Coordina con tu supervisor si necesitas apoyo.</li>` : ""}
      </ul>
    </div>
    ` : ""}

    ${level === "excelente" ? `
    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <strong>🎉 ¡Felicitaciones!</strong>
      <p style="margin: 8px 0 0 0;">Tu desempeño es ejemplar. Completaste ${metrics.completedOnTime} hitos a tiempo con una tasa del ${metrics.onTimeRate}%. ¡Sigue así!</p>
    </div>
    ` : ""}

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
      Este reporte es generado automáticamente por Solar Project Manager - Green House Project.<br>
      Las métricas se calculan con base en los hitos asignados y su cumplimiento.
    </p>
  `);

  return sendEmail({
    to: toEmail,
    subject: `${config.icon} Evaluación de Desempeño ${monthName} - Score: ${score}/100`,
    html: content,
  });
}
