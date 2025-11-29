import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function checkData() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log("\n=== Datos de proyectos ===\n");
  
  const [projects] = await connection.execute(`
    SELECT id, name, status, progressPercentage 
    FROM projects 
    ORDER BY id
  `);
  
  console.table(projects);
  
  await connection.end();
}

checkData().catch(console.error);
