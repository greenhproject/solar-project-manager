import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './drizzle/schema.js';
import { eq } from 'drizzle-orm';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'solar_project_manager',
});

const db = drizzle(connection, { schema, mode: 'default' });

console.log('Buscando usuario: proyectos@greenhproject.com');

const user = await db.select()
  .from(schema.users)
  .where(eq(schema.users.email, 'proyectos@greenhproject.com'));

console.log('Usuario encontrado:', JSON.stringify(user, null, 2));

if (user.length > 0) {
  console.log('\nDetalles del usuario:');
  console.log('- ID:', user[0].id);
  console.log('- Email:', user[0].email);
  console.log('- Nombre:', user[0].name);
  console.log('- Rol:', user[0].role);
  console.log('- Tiene contraseña:', user[0].password ? 'Sí' : 'No');
  console.log('- Método de login:', user[0].loginMethod);
} else {
  console.log('\n❌ Usuario NO encontrado en la base de datos');
}

await connection.end();
