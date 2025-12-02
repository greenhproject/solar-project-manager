/**
 * Servicio de envío de emails usando Resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Email del remitente (debe estar verificado en Resend)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envía un email usando Resend
 */
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email');
    return false;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('[Email] Error sending email:', error);
      return false;
    }

    console.log('[Email] Email sent successfully:', data?.id);
    return true;
  } catch (error) {
    console.error('[Email] Exception sending email:', error);
    return false;
  }
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
      <h1>🌞 Solar Project Manager</h1>
      <p style="margin: 5px 0 0 0; color: #666;">GreenH Project</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Este es un email automático del Solar Project Manager.</p>
      <p>© ${new Date().getFullYear()} GreenH Project. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email para hito próximo a vencer
 */
export async function sendMilestoneDueSoonEmail(
  to: string,
  milestoneName: string,
  projectName: string,
  dueDate: Date,
  daysUntil: number
): Promise<boolean> {
  const content = `
    <div class="alert alert-warning">
      <h2 style="margin-top: 0;">⏰ Hito Próximo a Vencer</h2>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Hito:</strong> ${milestoneName}</p>
      <p><strong>Fecha de vencimiento:</strong> ${dueDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
      <p><strong>Tiempo restante:</strong> ${daysUntil} ${daysUntil === 1 ? 'día' : 'días'}</p>
    </div>
    <p>Este es un recordatorio de que el hito <strong>"${milestoneName}"</strong> del proyecto <strong>"${projectName}"</strong> vence pronto.</p>
    <p>Por favor, asegúrate de completarlo a tiempo.</p>
  `;

  return sendEmail({
    to,
    subject: `⏰ Recordatorio: ${milestoneName} vence en ${daysUntil} ${daysUntil === 1 ? 'día' : 'días'}`,
    html: getEmailTemplate(content),
  });
}

/**
 * Email para hito vencido
 */
export async function sendMilestoneOverdueEmail(
  to: string,
  milestoneName: string,
  projectName: string,
  dueDate: Date,
  daysOverdue: number
): Promise<boolean> {
  const content = `
    <div class="alert alert-danger">
      <h2 style="margin-top: 0;">🚨 Hito Vencido</h2>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Hito:</strong> ${milestoneName}</p>
      <p><strong>Fecha de vencimiento:</strong> ${dueDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
      <p><strong>Días de retraso:</strong> ${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'}</p>
    </div>
    <p>El hito <strong>"${milestoneName}"</strong> del proyecto <strong>"${projectName}"</strong> está vencido.</p>
    <p>Por favor, actualiza el estado del hito lo antes posible.</p>
  `;

  return sendEmail({
    to,
    subject: `🚨 Alerta: ${milestoneName} está vencido (${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'})`,
    html: getEmailTemplate(content),
  });
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
  const content = `
    <div class="alert alert-success">
      <h2 style="margin-top: 0;">🎉 ¡Proyecto Completado!</h2>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Ubicación:</strong> ${location || 'No especificada'}</p>
      <p><strong>Duración total:</strong> ${durationDays} días</p>
    </div>
    <p>¡Felicidades! El proyecto <strong>"${projectName}"</strong> ha alcanzado el 100% de completitud.</p>
    <p>Todos los hitos han sido completados exitosamente.</p>
  `;

  return sendEmail({
    to,
    subject: `🎉 ¡Proyecto Completado! - ${projectName}`,
    html: getEmailTemplate(content),
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
  const content = `
    <div class="alert alert-info">
      <h2 style="margin-top: 0;">📋 Nuevo Proyecto Asignado</h2>
      <p><strong>Ingeniero:</strong> ${engineerName}</p>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Ubicación:</strong> ${location || 'No especificada'}</p>
      <p><strong>Fecha de inicio:</strong> ${startDate.toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>
    <p>Se te ha asignado el proyecto <strong>"${projectName}"</strong>.</p>
    <p>Por favor, revisa los detalles y hitos del proyecto en el sistema.</p>
  `;

  return sendEmail({
    to,
    subject: `📋 Nuevo Proyecto Asignado: ${projectName}`,
    html: getEmailTemplate(content),
  });
}

/**
 * Email para actualización de proyecto
 */
export async function sendProjectUpdateEmail(
  to: string,
  projectName: string,
  updateTitle: string,
  updateDescription: string,
  createdBy: string
): Promise<boolean> {
  const content = `
    <div class="alert alert-info">
      <h2 style="margin-top: 0;">📝 Actualización de Proyecto</h2>
      <p><strong>Proyecto:</strong> ${projectName}</p>
      <p><strong>Actualización:</strong> ${updateTitle}</p>
      <p><strong>Creado por:</strong> ${createdBy}</p>
    </div>
    <p>${updateDescription}</p>
  `;

  return sendEmail({
    to,
    subject: `📝 Actualización: ${projectName} - ${updateTitle}`,
    html: getEmailTemplate(content),
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

  const content = `
    <div class="alert alert-${type}">
      <h2 style="margin-top: 0;">${icons[type]} ${title}</h2>
    </div>
    <p>${message}</p>
  `;

  return sendEmail({
    to,
    subject: `${icons[type]} ${title}`,
    html: getEmailTemplate(content),
  });
}
