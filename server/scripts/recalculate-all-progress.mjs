#!/usr/bin/env node
/**
 * Script para recalcular el progreso y estado de todos los proyectos
 * Ejecutar con: node server/scripts/recalculate-all-progress.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está configurada");
  process.exit(1);
}

console.log("🔄 Conectando a la base de datos...");

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

console.log("✅ Conectado exitosamente\n");

// Obtener todos los proyectos
console.log("📊 Obteniendo todos los proyectos...");
const [projects] = await connection.execute(
  "SELECT id, name, status FROM projects WHERE status != 'cancelled'"
);

console.log(`📦 Encontrados ${projects.length} proyectos\n`);

// Recalcular progreso para cada proyecto
for (const project of projects) {
  console.log(`\n🔍 Procesando: ${project.name} (ID: ${project.id})`);
  console.log(`   Estado actual: ${project.status}`);

  // Obtener hitos del proyecto
  const [milestones] = await connection.execute(
    "SELECT id, name, status FROM milestones WHERE projectId = ?",
    [project.id]
  );

  console.log(`   📋 Hitos encontrados: ${milestones.length}`);

  if (milestones.length === 0) {
    console.log(`   ⚠️  Sin hitos - estableciendo progreso a 0% y estado 'planning'`);
    await connection.execute(
      "UPDATE projects SET progressPercentage = 0, status = 'planning' WHERE id = ?",
      [project.id]
    );
    continue;
  }

  // Contar hitos completados
  const completedCount = milestones.filter(m => m.status === "completed").length;
  const progressPercentage = Math.round((completedCount / milestones.length) * 100);

  console.log(`   ✓ Completados: ${completedCount}/${milestones.length}`);
  console.log(`   📈 Progreso calculado: ${progressPercentage}%`);

  // Determinar nuevo estado
  let newStatus = "in_progress";
  if (progressPercentage === 0) {
    newStatus = "planning";
  } else if (progressPercentage === 100) {
    newStatus = "completed";
  }

  console.log(`   🔄 Nuevo estado: ${newStatus}`);

  // Actualizar proyecto
  await connection.execute(
    "UPDATE projects SET progressPercentage = ?, status = ? WHERE id = ?",
    [progressPercentage, newStatus, project.id]
  );

  console.log(`   ✅ Actualizado exitosamente`);
}

console.log("\n\n🎉 Proceso completado exitosamente");
console.log("📊 Resumen:");

// Mostrar resumen final
const [summary] = await connection.execute(`
  SELECT 
    status,
    COUNT(*) as count
  FROM projects
  WHERE status != 'cancelled'
  GROUP BY status
`);

console.log("\nProyectos por estado:");
for (const row of summary) {
  console.log(`  ${row.status}: ${row.count}`);
}

await connection.end();
console.log("\n✅ Conexión cerrada");
