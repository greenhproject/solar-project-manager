/**
 * Script de migración para producción (Railway)
 * Aplica cambios de schema de forma no-interactiva usando SQL directo
 * Se ejecuta durante el build de Railway en lugar de drizzle-kit push
 */
import mysql from 'mysql2/promise';

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL no está definida. Saltando migración.');
    process.exit(0);
  }

  console.log('[migrate] Conectando a la base de datos...');
  
  const connection = await mysql.createConnection(databaseUrl);
  
  try {
    // Obtener lista de tablas existentes
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );
    const existingTables = tables.map(t => t.TABLE_NAME);
    console.log('[migrate] Tablas existentes:', existingTables.join(', '));

    // 1. Crear tabla app_settings si no existe
    if (!existingTables.includes('app_settings')) {
      console.log('[migrate] Creando tabla app_settings...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          id int AUTO_INCREMENT NOT NULL,
          settingKey varchar(100) NOT NULL,
          settingValue text NOT NULL,
          description text,
          updatedBy int,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT app_settings_id PRIMARY KEY(id),
          CONSTRAINT app_settings_settingKey_unique UNIQUE(settingKey)
        )
      `);
      console.log('[migrate] Tabla app_settings creada exitosamente.');
    } else {
      console.log('[migrate] Tabla app_settings ya existe, saltando.');
    }

    // 2. Agregar columna defaultAssignedUserId a milestone_templates si no existe
    const [milestoneTemplateCols] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'milestone_templates' 
       AND COLUMN_NAME = 'defaultAssignedUserId'`
    );
    
    if (milestoneTemplateCols.length === 0) {
      console.log('[migrate] Agregando columna defaultAssignedUserId a milestone_templates...');
      await connection.query(`
        ALTER TABLE milestone_templates 
        ADD COLUMN defaultAssignedUserId int NULL
      `);
      console.log('[migrate] Columna defaultAssignedUserId agregada exitosamente.');
    } else {
      console.log('[migrate] Columna defaultAssignedUserId ya existe en milestone_templates, saltando.');
    }

    // 3. Verificar columnas faltantes en milestones (assignedUserId, observations)
    const [milestoneCols] = await connection.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'milestones'`
    );
    const milestoneColNames = milestoneCols.map(c => c.COLUMN_NAME);

    if (!milestoneColNames.includes('assignedUserId')) {
      console.log('[migrate] Agregando columna assignedUserId a milestones...');
      await connection.query(`ALTER TABLE milestones ADD COLUMN assignedUserId int NULL`);
      console.log('[migrate] Columna assignedUserId agregada.');
    }

    if (!milestoneColNames.includes('observations')) {
      console.log('[migrate] Agregando columna observations a milestones...');
      await connection.query(`ALTER TABLE milestones ADD COLUMN observations text NULL`);
      console.log('[migrate] Columna observations agregada.');
    }

    // 4. Verificar columna company_settings (si existe la tabla)
    if (!existingTables.includes('company_settings')) {
      console.log('[migrate] Creando tabla company_settings...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS company_settings (
          id int AUTO_INCREMENT NOT NULL,
          companyName varchar(255),
          companyRuc varchar(50),
          companyAddress text,
          companyPhone varchar(50),
          companyEmail varchar(255),
          companyWebsite varchar(255),
          companyLogoUrl text,
          updatedBy int,
          createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT company_settings_id PRIMARY KEY(id)
        )
      `);
      console.log('[migrate] Tabla company_settings creada exitosamente.');
    } else {
      console.log('[migrate] Tabla company_settings ya existe, saltando.');
    }

    // 5. CORRECCIÓN DE DATOS: Normalizar hitos con completedDate pero status incorrecto
    // Esto arregla el bug donde el portal muestra 0% a pesar de hitos completados
    console.log('[migrate] Normalizando estado de hitos inconsistentes...');
    const [fixResult] = await connection.query(`
      UPDATE milestones 
      SET status = 'completed' 
      WHERE completedDate IS NOT NULL 
        AND status != 'completed'
    `);
    console.log(`[migrate] Hitos corregidos (completedDate sin status completed): ${fixResult.affectedRows || 0}`);

    // También recalcular progressPercentage de todos los proyectos afectados
    const [projectsToFix] = await connection.query(`
      SELECT DISTINCT p.id 
      FROM projects p 
      JOIN milestones m ON m.projectId = p.id 
      WHERE m.status = 'completed'
    `);
    
    for (const proj of projectsToFix) {
      const [totalResult] = await connection.query(
        'SELECT COUNT(*) as total FROM milestones WHERE projectId = ?', [proj.id]
      );
      const [completedResult] = await connection.query(
        'SELECT COUNT(*) as completed FROM milestones WHERE projectId = ? AND (status = ? OR completedDate IS NOT NULL)', [proj.id, 'completed']
      );
      const total = totalResult[0].total;
      const completed = completedResult[0].completed;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      let newStatus = 'planning';
      if (progress === 100) newStatus = 'completed';
      else if (progress > 0) newStatus = 'in_progress';
      
      await connection.query(
        'UPDATE projects SET progressPercentage = ?, status = ? WHERE id = ?',
        [progress, newStatus, proj.id]
      );
    }
    console.log(`[migrate] Progreso recalculado para ${projectsToFix.length} proyectos.`);

    // 6. Auditoría de entregas al Centro de Notificaciones GHP Hub
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ghp_notification_delivery_logs (
        id int AUTO_INCREMENT NOT NULL,
        eventId varchar(160) NOT NULL,
        eventType varchar(100) NOT NULL,
        recipientEmail varchar(320) NOT NULL,
        payload text NOT NULL,
        deliveryStatus enum('sent','failed','skipped') NOT NULL,
        responseStatus int NULL,
        responseBody text NULL,
        error text NULL,
        durationMs int NULL,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT ghp_notification_delivery_logs_id PRIMARY KEY(id),
        INDEX ghp_delivery_event_idx (eventId),
        INDEX ghp_delivery_recipient_idx (recipientEmail),
        INDEX ghp_delivery_created_idx (createdAt)
      )
    `);
    console.log('[migrate] Tabla ghp_notification_delivery_logs lista.');

    console.log('[migrate] Migraci\u00f3n completada exitosamente.');
  } catch (error) {
    console.error('[migrate] Error durante la migración:', error.message);
    // No hacer exit(1) para no bloquear el deploy si hay errores menores
    // Los errores de "already exists" son esperados y no críticos
    if (error.code === 'ER_TABLE_EXISTS_ERROR' || error.code === 'ER_DUP_FIELDNAME') {
      console.log('[migrate] Error no crítico (tabla/columna ya existe), continuando...');
    } else {
      process.exit(1);
    }
  } finally {
    await connection.end();
  }
}

migrate();
