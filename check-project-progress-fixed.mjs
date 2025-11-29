import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function checkProgress() {
  const connection = await mysql.createConnection(DATABASE_URL);

  console.log("\n=== Proyectos y sus hitos ===\n");

  const [projects] = await connection.execute(`
    SELECT id, name, progressPercentage 
    FROM projects 
    ORDER BY id
  `);

  for (const project of projects) {
    console.log(`\n📊 Proyecto: ${project.name} (ID: ${project.id})`);
    console.log(`   Progreso actual: ${project.progressPercentage}%`);

    const [milestones] = await connection.execute(
      `
      SELECT id, name, status, dueDate, completedDate
      FROM milestones 
      WHERE projectId = ?
      ORDER BY id
    `,
      [project.id]
    );

    console.log(`   Total hitos: ${milestones.length}`);

    const completed = milestones.filter(m => m.status === "completed").length;
    const expectedProgress =
      milestones.length > 0
        ? Math.round((completed / milestones.length) * 100)
        : 0;

    console.log(`   Hitos completados: ${completed}/${milestones.length}`);
    console.log(`   Progreso esperado: ${expectedProgress}%`);

    if (project.progressPercentage !== expectedProgress) {
      console.log(`   ⚠️  ERROR: Progreso incorrecto!`);
    }

    milestones.forEach(m => {
      console.log(
        `   - ${m.name}: ${m.status} ${m.completedDate ? `(completado: ${new Date(m.completedDate).toLocaleDateString()})` : ""}`
      );
    });
  }

  await connection.end();
}

checkProgress().catch(console.error);
