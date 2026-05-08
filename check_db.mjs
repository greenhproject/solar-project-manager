import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const dbInst = await getDb();
  if (!dbInst) {
    console.log('No db instance');
    process.exit(1);
  }
  const [tables] = await dbInst.execute(sql.raw('SHOW TABLES'));
  const names = tables.map(t => Object.values(t)[0]);
  console.log('api/webhook tables:', names.filter(n => n.includes('api') || n.includes('webhook') || n.includes('outgoing')));
  
  // Check if api_keys table exists
  try {
    const [rows] = await dbInst.execute(sql.raw('SELECT COUNT(*) as cnt FROM api_keys'));
    console.log('api_keys count:', rows[0].cnt);
  } catch(e) {
    console.log('api_keys table ERROR:', e.message);
  }
  
  // Check if webhooks table exists
  try {
    const [rows] = await dbInst.execute(sql.raw('SELECT COUNT(*) as cnt FROM webhooks'));
    console.log('webhooks count:', rows[0].cnt);
  } catch(e) {
    console.log('webhooks table ERROR:', e.message);
  }
  
  // Check if outgoing_webhook_logs table exists
  try {
    const [rows] = await dbInst.execute(sql.raw('SELECT COUNT(*) as cnt FROM outgoing_webhook_logs'));
    console.log('outgoing_webhook_logs count:', rows[0].cnt);
  } catch(e) {
    console.log('outgoing_webhook_logs table ERROR:', e.message);
  }
  
  process.exit(0);
}
main();
