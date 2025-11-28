import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

async function testMetrics() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  console.log("\n=== Testing Completion Rate ===");
  const completionResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM projects
  `);
  console.log("Raw result:", completionResult);
  const row1 = completionResult[0];
  console.log("First row:", row1);
  console.log("Total:", row1?.total, "Type:", typeof row1?.total);
  console.log("Completed:", row1?.completed, "Type:", typeof row1?.completed);

  console.log("\n=== Testing Average Time ===");
  const avgResult = await db.execute(sql`
    SELECT 
      AVG(DATEDIFF(updatedAt, startDate)) as avgDays,
      COUNT(*) as totalCompleted
    FROM projects
    WHERE status = 'completed' AND startDate IS NOT NULL
  `);
  console.log("Raw result:", avgResult);
  const row2 = avgResult[0];
  console.log("First row:", row2);
  console.log("AvgDays:", row2?.avgDays, "Type:", typeof row2?.avgDays);

  await connection.end();
}

testMetrics().catch(console.error);
