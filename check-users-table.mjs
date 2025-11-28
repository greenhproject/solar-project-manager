import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function checkTable() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log("=== Estructura de la tabla users ===\n");
  const [columns] = await connection.execute("DESCRIBE users");
  console.table(columns);
  
  await connection.end();
}

checkTable().catch(console.error);
