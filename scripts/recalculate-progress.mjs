#!/usr/bin/env node
/**
 * Script para recalcular el progreso de todos los proyectos
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ Error: DATABASE_URL no está configurada");
  process.exit(1);
}

async function recalculateProgress() {
  let connection;

  try {
    console.log("🔌 Conectando a la base de datos...");
    connection = await mysql.createConnection(DATABASE_URL);

    console.log("📊 Obteniendo proyectos...");
    const [projects] = await connection.execute(
      "SELECT id, name, status FROM projects WHERE status != 'completed' AND status != 'cancelled'"
    );

    console.log(`\n📋 Encontrados ${projects.length} proyectos activos\n`);

    for (const project of projects) {
      console.log(`\n🔍 Proyecto: ${project.name} (ID: ${project.id})`);

      // Obtener hitos del proyecto
      const [milestones] = await connection.execute(
        "SELECT id, name, status FROM milestones WHERE projectId = ?",
        [project.id]
      );

      console.log(`   📌 Total de hitos: ${milestones.length}`);

      if (milestones.length === 0) {
        console.log(`   ⚠️  Sin hitos - manteniendo progreso en 0%`);
        await connection.execute(
          "UPDATE projects SET progressPercentage = 0 WHERE id = ?",
          [project.id]
        );
        continue;
      }

      // Contar completados
      const completed = milestones.filter(m => m.status === "completed").length;
      const progress = Math.round((completed / milestones.length) * 100);

      console.log(`   ✅ Hitos completados: ${completed}/${milestones.length}`);
      console.log(`   📈 Progreso calculado: ${progress}%`);

      // Actualizar proyecto
      await connection.execute(
        "UPDATE projects SET progressPercentage = ? WHERE id = ?",
        [progress, project.id]
      );

      console.log(`   ✨ Progreso actualizado`);
    }

    console.log("\n\n✅ Recálculo completado exitosamente!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

recalculateProgress();
