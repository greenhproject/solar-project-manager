import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const dbInst = db.db || db;
  const [tables] = await dbInst.execute(sql`SHOW TABLES`);
  const tableNames = tables.map(t => Object.values(t)[0]);
  console.log('Tables related to api/webhook:', tableNames.filter(t => t.includes('api') || t.includes('webhook') || t.includes('outgoing')));
  console.log('Total tables:', tableNames.length);
  process.exit(0);
}
main();
